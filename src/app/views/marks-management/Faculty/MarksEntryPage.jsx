// src/app/views/marks-management/Faculty/MarksEntryPage.jsx
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../shared/Card';
import { useAuth } from 'app/contexts/AuthContext';
import api from '../../../services/api';
import { Save, Pencil, Unlock, Check, Download, FileSpreadsheet, Users, X, TrendingUp, ArrowRightLeft } from 'lucide-react';

// --- Student Selection Modal (Unchanged) ---
const StudentMappingModal = ({ isOpen, onClose, students, selectedStudentIds, onSave }) => {
    const [tempSelected, setTempSelected] = useState(new Set(selectedStudentIds));
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        setTempSelected(new Set(selectedStudentIds));
    }, [selectedStudentIds, isOpen]);

    if (!isOpen) return null;

    const handleToggle = (id) => {
        const newSet = new Set(tempSelected);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setTempSelected(newSet);
    };

    const handleSelectAll = () => {
        if (tempSelected.size === students.length) {
            setTempSelected(new Set());
        } else {
            setTempSelected(new Set(students.map(s => s.id)));
        }
    };

    const filteredStudents = students.filter(s => 
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        s.usn.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl mx-4 flex flex-col max-h-[80vh]">
                <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Map Students to Improvement Test</h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                        <X className="h-5 w-5" />
                    </button>
                </div>
                
                <div className="p-4 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 space-y-3">
                    <input 
                        type="text" 
                        placeholder="Search by Name or USN..." 
                        className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                    <div className="flex justify-between items-center text-sm text-gray-600 dark:text-gray-400">
                        <span>{tempSelected.size} students selected</span>
                        <button 
                            onClick={handleSelectAll}
                            className="text-primary-600 hover:underline font-medium"
                        >
                            {tempSelected.size === students.length ? 'Deselect All' : 'Select All'}
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {filteredStudents.map(student => (
                            <div 
                                key={student.id} 
                                onClick={() => handleToggle(student.id)}
                                className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${
                                    tempSelected.has(student.id) 
                                        ? 'bg-primary-50 border-primary-200 dark:bg-primary-900/20 dark:border-primary-800' 
                                        : 'hover:bg-gray-50 border-gray-200 dark:border-gray-700 dark:hover:bg-gray-700'
                                }`}
                            >
                                <input 
                                    type="checkbox" 
                                    checked={tempSelected.has(student.id)}
                                    readOnly
                                    className="h-4 w-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500 pointer-events-none"
                                />
                                <div className="ml-3">
                                    <p className="text-sm font-medium text-gray-900 dark:text-white">{student.name}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">{student.usn}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                    {filteredStudents.length === 0 && (
                        <p className="text-center text-gray-500 py-8">No students found.</p>
                    )}
                </div>

                <div className="p-4 border-t dark:border-gray-700 flex justify-end gap-3 bg-gray-50 dark:bg-gray-900/50 rounded-b-lg">
                    <button 
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 dark:bg-gray-700 dark:text-white dark:border-gray-600 dark:hover:bg-gray-600"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={() => onSave(tempSelected)}
                        className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700 shadow-sm"
                    >
                        Update Mapping
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- COMPARISON & OVERRIDE MODAL ---
const ComparisonModal = ({ isOpen, onClose, data, onOverride }) => {
    if (!isOpen || !data) return null;

    const { student, originalMarks, improvementMarks, config } = data;

    // Helper to sum scores based on config structure
    const calcTotal = (scores) => {
        return config.questions.reduce((acc, q) => acc + (parseInt(scores?.[q.q] || 0) || 0), 0);
    };

    const origTotal = calcTotal(originalMarks);
    const impTotal = calcTotal(improvementMarks);
    const isImpBetter = impTotal > origTotal;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-full max-w-md overflow-hidden transform transition-all scale-100">
                <div className="p-5 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Improvement Comparison</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{student.name} ({student.usn})</p>
                </div>

                <div className="p-5">
                    <div className="overflow-hidden border rounded-lg dark:border-gray-700">
                        <table className="min-w-full text-sm divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-700">
                                <tr>
                                    <th className="px-4 py-2 text-left font-medium text-gray-500 dark:text-gray-300">Metric</th>
                                    <th className="px-4 py-2 text-center font-medium text-gray-500 dark:text-gray-300">Original</th>
                                    <th className="px-4 py-2 text-center font-medium text-gray-500 dark:text-gray-300 bg-purple-50 dark:bg-purple-900/20">Improvement</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {config.questions.map(q => (
                                    <tr key={q.q}>
                                        <td className="px-4 py-2 font-medium text-gray-700 dark:text-gray-200">{q.q}</td>
                                        <td className="px-4 py-2 text-center text-gray-600 dark:text-gray-400">
                                            {originalMarks?.[q.q] ?? '-'}
                                        </td>
                                        <td className="px-4 py-2 text-center font-medium text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-900/10">
                                            {improvementMarks?.[q.q] ?? '-'}
                                        </td>
                                    </tr>
                                ))}
                                <tr className="bg-gray-50 dark:bg-gray-700 font-bold border-t-2 border-gray-200 dark:border-gray-600">
                                    <td className="px-4 py-3">Total</td>
                                    <td className="px-4 py-3 text-center">{origTotal}</td>
                                    <td className={`px-4 py-3 text-center ${isImpBetter ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-300'}`}>
                                        {impTotal}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="p-4 border-t dark:border-gray-700 flex justify-end gap-3 bg-gray-50 dark:bg-gray-900/50">
                    <button 
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 dark:bg-gray-700 dark:text-white dark:border-gray-600 dark:hover:bg-gray-600"
                    >
                        Close
                    </button>
                    <button 
                        onClick={onOverride}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 shadow-sm"
                    >
                        <ArrowRightLeft className="w-4 h-4" />
                        Override Marks
                    </button>
                </div>
            </div>
        </div>
    );
};


const MarksEntryPage = () => {
  const { user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  
  const [selectedAssessmentName, setSelectedAssessmentName] = useState('');
  
  const [isTableVisible, setIsTableVisible] = useState(false);
  const [currentStudents, setCurrentStudents] = useState([]); 
  const [marks, setMarks] = useState({}); 
  const [improvementMarks, setImprovementMarks] = useState({});
  const [marksMeta, setMarksMeta] = useState({});
  const [editableRows, setEditableRows] = useState({}); 
  const [showSuccess, setShowSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Modals State
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [comparisonData, setComparisonData] = useState(null); // For Comparison Modal

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

  const selectedCourse = useMemo(() => 
    courses.find(c => c.id === selectedCourseId), 
  [courses, selectedCourseId]);

  const assessmentOptions = useMemo(() => {
      return selectedCourse?.assessmentTools || [];
  }, [selectedCourse]);

  useEffect(() => {
      if (assessmentOptions.length > 0) {
          setSelectedAssessmentName(assessmentOptions[0].name);
      } else {
          setSelectedAssessmentName('');
      }
      handleSelectionChange();
  }, [selectedCourseId, assessmentOptions]);

  const currentAssessmentConfig = useMemo(() => {
      const tool = assessmentOptions.find(t => t.name === selectedAssessmentName);
      if (!tool) return null;

      const isSEE = tool.type === 'Semester End Exam' || tool.name === 'Semester End Exam';
      const isActivity = tool.type === 'Activity' || tool.name.startsWith('Activity');
      const isImprovement = tool.type === 'Improvement Test' || tool.name.startsWith('Improvement');

      let config = {
          total: tool.maxMarks || 0,
          isExternal: false,
          isImprovement: isImprovement,
          questions: []
      };

      if (isSEE) {
          config.isExternal = true;
          config.questions = [{ q: 'External', co: '', max: tool.maxMarks || 100 }];
      } else if (isActivity) {
          config.questions = [{ q: 'Score', co: '-', max: tool.maxMarks || 0 }];
      } else {
          config.questions = Object.entries(tool.coDistribution || {}).map(([coId, marks]) => ({
              q: coId,
              co: coId,
              max: parseInt(marks) || 0
          }));
      }

      return config;
  }, [assessmentOptions, selectedAssessmentName]);


  const handleSelectionChange = () => {
      setIsTableVisible(false);
      setCurrentStudents([]);
      setMarks({});
      setImprovementMarks({});
      setMarksMeta({});
      setEditableRows({});
      setShowSuccess(false);
      setComparisonData(null);
  };

  // 2. Fetch Students & Existing Marks
  const handleLoadStudents = async () => {
    if (!selectedCourseId || !selectedAssessmentName || !currentAssessmentConfig) return;
    setLoading(true);
    try {
        const studentsRes = await api.get(`/students?courseId=${selectedCourseId}`);
        const students = studentsRes.data;
        setCurrentStudents(students);

        const marksRes = await api.get(`/marks?courseId=${selectedCourseId}&assessment=${selectedAssessmentName}`);
        const existingMarks = marksRes.data;

        // Fetch Linked Improvement Test Marks
        const improvementTool = assessmentOptions.find(t => 
            t.type === 'Improvement Test' && t.linkedAssessment === selectedAssessmentName
        );

        let fetchedImpMarks = {};
        if (improvementTool) {
            const impMarksRes = await api.get(`/marks?courseId=${selectedCourseId}&assessment=${improvementTool.name}`);
            impMarksRes.data.forEach(r => {
                fetchedImpMarks[r.studentId] = r.scores;
            });
        }
        setImprovementMarks(fetchedImpMarks);

        const initialMarks = {};
        const initialMeta = {};
        const initialEditable = {};

        existingMarks.forEach(record => {
            initialMarks[record.studentId] = record.scores || {};
            initialMeta[record.studentId] = record;
        });

        students.forEach(student => {
            if (!currentAssessmentConfig.isImprovement) {
                 if (!initialMarks[student.id]) {
                     initialMarks[student.id] = {};
                     initialEditable[student.id] = true;
                 }
            } else {
                 if (!initialMarks[student.id]) {
                     // For improvement tests, do not auto-init
                 }
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

  // --- Handlers for Modals & Overrides ---
  
  const handleUpdateStudentMapping = (selectedIdsSet) => {
      const newMarks = { ...marks };
      const newEditable = { ...editableRows };

      selectedIdsSet.forEach(id => {
          if (!newMarks[id]) {
              newMarks[id] = {}; 
              newEditable[id] = true; 
          }
      });

      Object.keys(newMarks).forEach(id => {
          if (!selectedIdsSet.has(id)) {
              delete newMarks[id];
              delete newEditable[id];
          }
      });

      setMarks(newMarks);
      setEditableRows(newEditable);
      setIsStudentModalOpen(false);
  };

  const openComparisonModal = (student) => {
      setComparisonData({
          student,
          originalMarks: marks[student.id] || {},
          improvementMarks: improvementMarks[student.id] || {},
          config: currentAssessmentConfig
      });
  };

  const handleOverrideConfirm = () => {
      if (!comparisonData) return;
      const { student, improvementMarks } = comparisonData;
      
      const newMarks = { ...marks };
      newMarks[student.id] = { ...improvementMarks }; // Copy values
      
      setMarks(newMarks);
      setEditableRows(prev => ({ ...prev, [student.id]: true })); // Enable edit so they can see change
      setComparisonData(null); // Close modal
  };

  const displayedStudents = useMemo(() => {
      if (!currentAssessmentConfig?.isImprovement) return currentStudents;
      return currentStudents.filter(s => marks.hasOwnProperty(s.id));
  }, [currentStudents, marks, currentAssessmentConfig]);

  const handleMarksChange = (studentId, questionIdentifier, value) => {
    const newMarks = JSON.parse(JSON.stringify(marks));
    const max = currentAssessmentConfig.questions.find(q => q.q === questionIdentifier)?.max || currentAssessmentConfig.total;
    
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
      let total = 0;
      if (currentAssessmentConfig?.questions) {
          currentAssessmentConfig.questions.forEach(q => {
              total += Number(studentMarks[q.q]) || 0;
          });
      }
      return total;
  };

  const toggleEditRow = (studentId) => {
    setEditableRows(prev => ({ ...prev, [studentId]: !prev[studentId] }));
  };

  const handleSaveChanges = async () => {
    setLoading(true);
    try {
        const promises = displayedStudents.map(async (student) => {
            const scores = marks[student.id];
            if (!scores) return; 

            const existingRecord = marksMeta[student.id];
            
            const payload = {
                studentId: student.id,
                courseId: selectedCourseId,
                assessment: selectedAssessmentName,
                scores: scores
            };

            if (existingRecord) {
                await api.patch(`/marks/${existingRecord.id}`, { scores });
            } else {
                const newId = `M_${selectedCourseId}_${student.id}_${selectedAssessmentName.replace(/\s/g, '')}`;
                await api.post('/marks', { ...payload, id: newId });
            }
        });

        if (currentAssessmentConfig.isImprovement) {
            const originalIds = Object.keys(marksMeta);
            const currentIds = new Set(Object.keys(marks));
            const toDelete = originalIds.filter(id => !currentIds.has(id));
            
            toDelete.forEach(async (id) => {
                if (marksMeta[id]) {
                    await api.delete(`/marks/${marksMeta[id].id}`);
                }
            });
        }

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

  // --- CSV Handlers ---
  const handleDownloadTemplate = () => {
    if (!displayedStudents.length) {
        alert("No students found in the list. Please add students first.");
        return;
    }
    const headers = ['USN', 'Name'];
    currentAssessmentConfig.questions.forEach(q => headers.push(`${q.q} (${q.max})`));
    const rows = displayedStudents.map(student => {
        const row = [student.usn, student.name];
        currentAssessmentConfig.questions.forEach(q => {
            row.push(marks[student.id]?.[q.q] || '');
        });
        return row.join(',');
    });
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${selectedCourse.code}_${selectedAssessmentName}_Template.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleBulkUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        const text = e.target.result;
        const rows = text.split('\n').map(row => row.split(','));
        rows.shift(); 
        const newMarks = { ...marks };
        let updatedCount = 0;
        rows.forEach(row => {
            if (row.length < 3) return;
            const usn = row[0].trim();
            const student = currentStudents.find(s => s.usn === usn);
            if (student) {
                if (currentAssessmentConfig.isImprovement && !newMarks[student.id]) return; 
                if (!newMarks[student.id]) newMarks[student.id] = {};
                currentAssessmentConfig.questions.forEach((q, idx) => {
                    const val = parseInt(row[idx + 2]); 
                    if (!isNaN(val) && val <= q.max) {
                        newMarks[student.id][q.q] = val;
                        updatedCount++;
                    }
                });
            }
        });
        setMarks(newMarks);
        alert(`Successfully updated marks for ${updatedCount} entries.`);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6 relative">
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

      {/* Modals */}
      <StudentMappingModal 
        isOpen={isStudentModalOpen}
        onClose={() => setIsStudentModalOpen(false)}
        students={currentStudents}
        selectedStudentIds={Object.keys(marks)}
        onSave={handleUpdateStudentMapping}
      />

      <ComparisonModal 
        isOpen={!!comparisonData}
        onClose={() => setComparisonData(null)}
        data={comparisonData}
        onOverride={handleOverrideConfirm}
      />

      {/* Top Bar */}
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
                    value={selectedAssessmentName}
                    onChange={(e) => {
                        setSelectedAssessmentName(e.target.value);
                        handleSelectionChange();
                    }}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    disabled={assessmentOptions.length === 0}
                >
                     {assessmentOptions.length > 0 ? (
                         assessmentOptions.map(tool => <option key={tool.id} value={tool.name}>{tool.name}</option>)
                     ) : (
                         <option>No assessments configured</option>
                     )}
                  </select>
               </div>
               
               <div className="sm:col-span-1 flex flex-col gap-3">
                 <button 
                    onClick={handleLoadStudents}
                    className="w-full justify-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
                    disabled={!selectedCourseId || !selectedAssessmentName || loading}
                >
                    {loading ? 'Loading...' : 'Load Student List'}
                </button>

                 {isTableVisible && (
                     <div className="flex gap-2">
                        <input type="file" accept=".csv" ref={fileInputRef} onChange={handleBulkUpload} className="hidden" />
                        <button onClick={handleDownloadTemplate} className="flex-1 flex items-center justify-center px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-xs font-medium shadow-sm transition-colors dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700" title="Download CSV Template">
                            <Download className="w-3 h-3 mr-2" /> Template
                        </button>
                        <button onClick={() => fileInputRef.current.click()} className="flex-1 flex items-center justify-center px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-xs font-medium shadow-sm transition-colors" title="Upload Filled CSV">
                            <FileSpreadsheet className="w-3 h-3 mr-2" /> Upload
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
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle>{selectedCourse.code} - {selectedCourse.name}</CardTitle>
                        <CardDescription>Entering marks for: <span className="font-semibold text-primary-600 dark:text-primary-400">{selectedAssessmentName}</span></CardDescription>
                    </div>
                    
                    {currentAssessmentConfig.isImprovement && (
                        <button 
                            onClick={() => setIsStudentModalOpen(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-white border border-primary-200 text-primary-700 rounded-lg hover:bg-primary-50 text-sm font-medium shadow-sm dark:bg-gray-700 dark:border-gray-600 dark:text-primary-300 dark:hover:bg-gray-600"
                        >
                            <Users className="h-4 w-4" />
                            Manage Students
                        </button>
                    )}
                </div>
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
                      
                      {currentAssessmentConfig.questions.map(q => (
                         <th key={q.q} scope="col" className="px-3 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                           {q.q} <span className="font-normal normal-case">[{q.max}M]</span>
                         </th>
                      ))}

                      <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider border-l dark:border-gray-600">
                        Total <span className="font-normal normal-case">[{currentAssessmentConfig.total}]</span>
                      </th>
                      <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider border-l dark:border-gray-600">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {displayedStudents.length === 0 ? (
                        <tr>
                            <td colSpan={5 + currentAssessmentConfig.questions.length} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                                {currentAssessmentConfig.isImprovement 
                                    ? "No students mapped to this improvement test yet. Click 'Manage Students' to add." 
                                    : "No students found."}
                            </td>
                        </tr>
                    ) : (
                        displayedStudents.map(student => {
                        const isEditing = editableRows[student.id];
                        const hasImprovement = !!improvementMarks[student.id];
                        
                        return (
                            <tr key={student.id} className={isEditing ? "bg-blue-50 dark:bg-blue-900/20" : ""}>
                            <td className="sticky left-0 bg-inherit px-4 py-4 text-sm font-mono text-gray-700 dark:text-gray-300 border-r dark:border-gray-600">{student.usn}</td>
                            <td className="sticky left-40 bg-inherit px-4 py-4 text-sm font-medium text-gray-900 dark:text-white border-r dark:border-gray-600">
                                {student.name}
                                {hasImprovement && (
                                    <span className="ml-2 px-1.5 py-0.5 text-[10px] uppercase font-bold text-white bg-purple-500 rounded cursor-help" title="Improvement Test Attended">
                                        IMP
                                    </span>
                                )}
                            </td>
                            
                            {currentAssessmentConfig.questions.map(q => (
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
                            ))}

                            <td className="px-4 py-4 text-center font-bold text-gray-800 dark:text-gray-100 border-l dark:border-gray-600">
                                {calculateTotal(student.id)}
                            </td>

                            {/* ACTIONS COLUMN WITH COMPARISON BUTTON */}
                            <td className="px-4 py-4 text-center border-l dark:border-gray-600">
                                <div className="flex justify-center gap-2">
                                    {hasImprovement && (
                                        <button
                                            onClick={() => openComparisonModal(student)}
                                            className="p-2 text-purple-600 hover:bg-purple-50 dark:text-purple-400 dark:hover:bg-purple-900/30 rounded-md transition-colors"
                                            title="Compare & Override Marks"
                                        >
                                            <TrendingUp className="w-4 h-4" />
                                        </button>
                                    )}
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
                                </div>
                            </td>
                            </tr>
                        );
                        })
                    )}
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