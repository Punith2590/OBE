import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../shared/Card';
import { useAuth } from 'app/contexts/AuthContext';
import api from '../../../services/api';
import { Save, Pencil, Unlock, Check, Download, FileSpreadsheet } from 'lucide-react';

const ASSESSMENT_CONFIG = {
    'Internal Assessment 1': { questions: [{ q: 'Part A', co: 'CO1', max: 15 }, { q: 'Part B', co: 'CO2', max: 15 }], total: 30 },
    'Internal Assessment 2': { questions: [{ q: 'Part A', co: 'CO2', max: 15 }, { q: 'Part B', co: 'CO3', max: 15 }], total: 30 },
    'Internal Assessment 3': { questions: [{ q: 'Part A', co: 'CO4', max: 15 }, { q: 'Part B', co: 'CO5', max: 15 }], total: 30 },
    'Assignment 1': { questions: [{ q: 'Part A', co: 'CO1', max: 10 }, { q: 'Part B', co: 'CO2', max: 10 }], total: 20 },
    'Assignment 2': { questions: [{ q: 'Part A', co: 'CO2', max: 10 }, { q: 'Part B', co: 'CO3', max: 10 }], total: 20 },
    'Assignment 3': { questions: [{ q: 'Part A', co: 'CO4', max: 10 }, { q: 'Part B', co: 'CO5', max: 10 }], total: 20 },
    'Semester End Exam': { questions: [], total: 100, isExternal: true },
};

const assessmentOptions = Object.keys(ASSESSMENT_CONFIG);

const MarksEntryPage = () => {
  const { user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [selectedAssessment, setSelectedAssessment] = useState(assessmentOptions[0]);
  
  const [isTableVisible, setIsTableVisible] = useState(false);
  const [currentStudents, setCurrentStudents] = useState([]);
  const [marks, setMarks] = useState({}); 
  const [marksMeta, setMarksMeta] = useState({});
  const [editableRows, setEditableRows] = useState({}); 
  const [showSuccess, setShowSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Ref for hidden file input
  const fileInputRef = useRef(null);

  // 1. Fetch Assigned Courses
  useEffect(() => {
    const fetchCourses = async () => {
        if (!user) return;
        try {
            const res = await api.get(`/courses?assignedFacultyId=${user.id}`);
            setCourses(res.data);
            if (res.data.length > 0) {
                setSelectedCourseId(res.data[0].id);
            }
        } catch (error) {
            console.error("Failed to load courses", error);
        }
    };
    fetchCourses();
  }, [user]);

  const selectedCourse = courses.find(c => c.id === selectedCourseId);
  const currentAssessmentConfig = useMemo(() => ASSESSMENT_CONFIG[selectedAssessment], [selectedAssessment]);

  const handleSelectionChange = () => {
      setIsTableVisible(false);
      setCurrentStudents([]);
      setMarks({});
      setMarksMeta({});
      setEditableRows({});
      setShowSuccess(false);
  };

  // 2. Fetch Students & Existing Marks
  const handleLoadStudents = async () => {
    if (!selectedCourseId) return;
    setLoading(true);
    try {
        const studentsRes = await api.get(`/students?courseId=${selectedCourseId}`);
        const students = studentsRes.data;
        setCurrentStudents(students);

        const marksRes = await api.get(`/marks?courseId=${selectedCourseId}&assessment=${selectedAssessment}`);
        const existingMarks = marksRes.data;

        const initialMarks = {};
        const initialMeta = {};
        const initialEditable = {};

        students.forEach(student => {
            const record = existingMarks.find(m => m.studentId === student.id);
            if (record) {
                initialMarks[student.id] = record.scores || {};
                initialMeta[student.id] = record;
            } else {
                initialMarks[student.id] = {};
                initialEditable[student.id] = true;
            }
        });

        setMarks(initialMarks);
        setMarksMeta(initialMeta);
        setEditableRows(initialEditable);
        setIsTableVisible(true);

    } catch (error) {
        console.error("Failed to load data", error);
        alert("Error loading data.");
    } finally {
        setLoading(false);
    }
  };

  const handleMarksChange = (studentId, questionIdentifier, value) => {
    const newMarks = JSON.parse(JSON.stringify(marks));
    const max = currentAssessmentConfig.isExternal 
        ? currentAssessmentConfig.total 
        : currentAssessmentConfig.questions.find(q => q.q === questionIdentifier)?.max || 0;
    
    if (value === '') {
        delete newMarks[studentId][questionIdentifier];
    } else {
        let numValue = parseInt(value, 10);
        if (!isNaN(numValue)) {
            numValue = Math.max(0, Math.min(numValue, max));
            if (!newMarks[studentId]) newMarks[studentId] = {};
            newMarks[studentId][questionIdentifier] = numValue;
        }
    }
    setMarks(newMarks);
  };

  const calculateTotal = (studentId) => {
      const studentMarks = marks[studentId];
      if (!studentMarks) return 0;
      return Object.values(studentMarks).reduce((acc, curr) => acc + (Number(curr) || 0), 0);
  };

  const toggleEditRow = (studentId) => {
    setEditableRows(prev => ({ ...prev, [studentId]: !prev[studentId] }));
  };

  const handleSaveChanges = async () => {
    setLoading(true);
    try {
        const promises = currentStudents.map(async (student) => {
            const scores = marks[student.id];
            if (!scores || Object.keys(scores).length === 0) return;

            const existingRecord = marksMeta[student.id];
            const payload = {
                studentId: student.id,
                courseId: selectedCourseId,
                assessment: selectedAssessment,
                scores: scores
            };

            if (existingRecord) {
                await api.patch(`/marks/${existingRecord.id}`, { scores });
            } else {
                const newId = `M_${selectedCourseId}_${student.id}_${selectedAssessment.replace(/\s/g, '')}`;
                await api.post('/marks', { ...payload, id: newId });
            }
        });

        await Promise.all(promises);
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
        handleLoadStudents(); 
    } catch (error) {
        console.error("Save failed", error);
        alert("Failed to save marks.");
    } finally {
        setLoading(false);
    }
  };

  // --- CSV DOWNLOAD HANDLER ---
  const handleDownloadTemplate = () => {
    if (!currentStudents.length) return;

    // Define Headers
    const headers = ['USN', 'Name'];
    if (currentAssessmentConfig.isExternal) {
        headers.push(`External (${currentAssessmentConfig.total})`);
    } else {
        currentAssessmentConfig.questions.forEach(q => headers.push(`${q.q} (${q.max})`));
    }

    // Define Rows
    const rows = currentStudents.map(student => {
        const row = [student.usn, student.name];
        if (currentAssessmentConfig.isExternal) {
            row.push(marks[student.id]?.['external'] || '');
        } else {
            currentAssessmentConfig.questions.forEach(q => {
                row.push(marks[student.id]?.[q.q] || '');
            });
        }
        return row.join(',');
    });

    // Combine and Download
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${selectedCourse.code}_${selectedAssessment}_Template.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- CSV BULK UPLOAD HANDLER ---
  const handleBulkUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        const text = e.target.result;
        const rows = text.split('\n').map(row => row.split(','));
        
        // Remove Header
        rows.shift();

        const newMarks = { ...marks };
        let updatedCount = 0;

        rows.forEach(row => {
            if (row.length < 3) return; // Skip empty rows
            const usn = row[0].trim();
            
            // Find student by USN
            const student = currentStudents.find(s => s.usn === usn);
            if (student) {
                if (!newMarks[student.id]) newMarks[student.id] = {};

                if (currentAssessmentConfig.isExternal) {
                    // Update External
                    const val = parseInt(row[2]);
                    if (!isNaN(val) && val <= currentAssessmentConfig.total) {
                        newMarks[student.id]['external'] = val;
                        updatedCount++;
                    }
                } else {
                    // Update Question parts
                    currentAssessmentConfig.questions.forEach((q, idx) => {
                        const val = parseInt(row[idx + 2]); // Offset by 2 (USN, Name)
                        if (!isNaN(val) && val <= q.max) {
                            newMarks[student.id][q.q] = val;
                            updatedCount++;
                        }
                    });
                }
            }
        });

        setMarks(newMarks);
        alert(`Successfully parsed marks for ${updatedCount} entries.`);
        
        // Reset file input
        if (fileInputRef.current) fileInputRef.current.value = "";
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6 relative">
      {/* Success Notification */}
      {showSuccess && (
        <div className="fixed top-20 right-6 z-50 animate-in slide-in-from-top-5 duration-300">
            <div className="bg-white dark:bg-gray-800 border-l-4 border-green-500 shadow-lg rounded-r-lg flex items-center p-4 min-w-[300px]">
                <Check className="h-6 w-6 text-green-500 mr-3" />
                <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Success</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Marks saved successfully!</p>
                </div>
            </div>
        </div>
      )}

      {/* Top Bar with Title and Save Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Marks Entry</h1>
        
        {isTableVisible && (
             <button
                onClick={handleSaveChanges}
                disabled={loading}
                className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-medium shadow-sm transition-colors disabled:opacity-50"
            >
                {loading ? 'Saving...' : <><Save className="w-4 h-4 mr-2" /> Save All</>}
            </button>
        )}
      </div>

      {/* Selection Card */}
      <Card>
        <CardHeader>
          <CardTitle>Select Course and Assessment</CardTitle>
          <CardDescription>Choose the course and assessment for which you want to enter marks.</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
               <div className="sm:col-span-1">
                 <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Course</label>
                 <select 
                    value={selectedCourseId}
                    onChange={(e) => {
                        setSelectedCourseId(e.target.value);
                        handleSelectionChange();
                    }}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    disabled={courses.length === 0}
                >
                    {courses.length > 0 ? courses.map(course => (
                      <option key={course.id} value={course.id}>{course.code} - {course.name}</option>
                    )) : <option>No courses assigned</option>}
                  </select>
               </div>
               <div className="sm:col-span-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Assessment</label>
                 <select 
                    value={selectedAssessment}
                    onChange={(e) => {
                        setSelectedAssessment(e.target.value);
                        handleSelectionChange();
                    }}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                     {assessmentOptions.map(opt => <option key={opt}>{opt}</option>)}
                  </select>
               </div>
               
               {/* Load Button and Bulk Options */}
               <div className="sm:col-span-1 flex flex-col gap-3">
                 <button 
                    onClick={handleLoadStudents}
                    className="w-full justify-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
                    disabled={!selectedCourseId || loading}
                >
                    {loading ? 'Loading...' : 'Load Student List'}
                 </button>

                 {/* Bulk Upload Controls appear here after loading table */}
                 {isTableVisible && (
                     <div className="flex gap-2">
                        {/* Hidden File Input */}
                        <input 
                            type="file" 
                            accept=".csv" 
                            ref={fileInputRef} 
                            onChange={handleBulkUpload} 
                            className="hidden" 
                        />
                        <button
                            onClick={handleDownloadTemplate}
                            className="flex-1 flex items-center justify-center px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-xs font-medium shadow-sm transition-colors dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
                            title="Download CSV Template"
                        >
                            <Download className="w-3 h-3 mr-2" />
                            Template
                        </button>
                        <button
                            onClick={() => fileInputRef.current.click()}
                            className="flex-1 flex items-center justify-center px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-xs font-medium shadow-sm transition-colors"
                            title="Upload Filled CSV"
                        >
                            <FileSpreadsheet className="w-3 h-3 mr-2" />
                            Upload
                        </button>
                     </div>
                 )}
               </div>
            </div>
        </CardContent>
      </Card>

      {/* Marks Table */}
      {isTableVisible && selectedCourse && currentAssessmentConfig && (
        <Card className="mt-6">
            <CardHeader>
                <CardTitle>{selectedCourse.code} - {selectedCourse.name}</CardTitle>
                <CardDescription>Entering marks for: <span className="font-semibold">{selectedAssessment}</span></CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 border dark:border-gray-600">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th scope="col" className="sticky left-0 bg-gray-50 dark:bg-gray-700 px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider border-r dark:border-gray-600">
                        USN
                      </th>
                      <th scope="col" className="sticky left-40 bg-gray-50 dark:bg-gray-700 px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider border-r dark:border-gray-600">
                        Student Name
                      </th>
                      {currentAssessmentConfig.isExternal ? (
                        <th scope="col" className="px-3 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                           External Marks <span className="font-normal normal-case">[{currentAssessmentConfig.total}M]</span>
                        </th>
                      ) : (
                        currentAssessmentConfig.questions.map(q => (
                         <th key={q.q} scope="col" className="px-3 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                           {q.q} ({q.co}) <span className="font-normal normal-case">[{q.max}M]</span>
                         </th>
                        ))
                      )}
                      <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider border-l dark:border-gray-600">
                        Total
                      </th>
                      <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider border-l dark:border-gray-600">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {currentStudents.map(student => {
                      const isEditing = editableRows[student.id];
                      return (
                        <tr key={student.id} className={isEditing ? "bg-blue-50 dark:bg-blue-900/20" : ""}>
                          <td className="sticky left-0 bg-inherit px-4 py-4 text-sm font-mono text-gray-700 dark:text-gray-300 border-r dark:border-gray-600">{student.usn}</td>
                          <td className="sticky left-40 bg-inherit px-4 py-4 text-sm font-medium text-gray-900 dark:text-white border-r dark:border-gray-600">{student.name}</td>
                          
                          {currentAssessmentConfig.isExternal ? (
                             <td className="px-3 py-2 whitespace-nowrap text-center text-sm">
                               <input
                                 type="number"
                                 min="0"
                                 disabled={!isEditing}
                                 max={currentAssessmentConfig.total}
                                 value={marks[student.id]?.['external'] ?? ''}
                                 onChange={e => handleMarksChange(student.id, 'external', e.target.value)}
                                 className="w-20 h-10 text-center border rounded-md disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-primary-500 focus:border-primary-500 transition-colors"
                               />
                             </td>
                          ) : (
                              currentAssessmentConfig.questions.map(q => (
                                  <td key={`${student.id}-${q.q}`} className="px-3 py-2 whitespace-nowrap text-center text-sm">
                                      <input
                                      type="number"
                                      min="0"
                                      disabled={!isEditing}
                                      max={q.max}
                                      value={marks[student.id]?.[q.q] ?? ''}
                                      onChange={e => handleMarksChange(student.id, q.q, e.target.value)}
                                      className="w-16 h-10 text-center border rounded-md disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-primary-500 focus:border-primary-500 transition-colors"
                                      />
                                  </td>
                              ))
                          )}
                          <td className="px-4 py-4 text-center font-bold text-gray-800 dark:text-gray-100 border-l dark:border-gray-600">
                            {calculateTotal(student.id)}
                          </td>
                          <td className="px-4 py-4 text-center border-l dark:border-gray-600">
                            <button
                                onClick={() => toggleEditRow(student.id)}
                                className={`p-2 rounded-md transition-colors ${
                                    isEditing 
                                    ? "text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/30" 
                                    : "text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
                                }`}
                                title={isEditing ? "Finish Editing" : "Edit Marks"}
                            >
                                {isEditing ? <Unlock className="w-4 h-4" /> : <Pencil className="w-4 h-4" />}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
        </Card>
      )}
    </div>
  );
};

export default MarksEntryPage;