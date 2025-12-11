import React, { useState, useMemo, useEffect } from 'react';
import { courses as mockCourses, pos as mockPos, psos as mockPsos, articulationMatrix as mockArticulationMatrix } from '../data/mockData';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../shared/Card';
import { Icons } from '../shared/icons';
import { useAuth } from 'app/contexts/AuthContext';

const ConfirmationModal = ({ onConfirm, onCancel }) => {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 transition-opacity" aria-modal="true" role="dialog">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Confirm Deletion</h3>
                <div className="mt-2">
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                        Are you sure you want to delete this outcome? This will remove all associated CO-PO/PSO mappings across all courses. This action cannot be undone.
                    </p>
                </div>
                <div className="mt-6 flex justify-end space-x-3">
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    >
                        Delete
                    </button>
                </div>
            </div>
        </div>
    );
};


const ArticulationMatrixPage = () => {
  const { user } = useAuth();

  const assignedCourses = useMemo(() => {
    if (!user) return [];
    return mockCourses.filter(c => c.assignedFacultyId === user.id);
  }, [user]);

  // States for current data
  const [courses, setCourses] = useState(assignedCourses);
  const [pos, setPos] = useState(mockPos);
  const [psos, setPsos] = useState(mockPsos);
  const [articulationMatrix, setArticulationMatrix] = useState(mockArticulationMatrix);

  // States for initial data to compare against for changes
  const [initialCourses, setInitialCourses] = useState(assignedCourses);
  const [initialPos, setInitialPos] = useState(mockPos);
  const [initialPsos, setInitialPsos] = useState(mockPsos);
  const [initialMatrix, setInitialMatrix] = useState(mockArticulationMatrix);

  const [isDirty, setIsDirty] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState(assignedCourses[0]?.id ?? '');
  const [syllabusFile, setSyllabusFile] = useState(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState({
    isOpen: false,
    outcomeId: null,
  });
  
  // Effect to check for changes and update isDirty state
  useEffect(() => {
    const coursesChanged = JSON.stringify(courses) !== JSON.stringify(initialCourses);
    const posChanged = JSON.stringify(pos) !== JSON.stringify(initialPos);
    const psosChanged = JSON.stringify(psos) !== JSON.stringify(initialPsos);
    const matrixChanged = JSON.stringify(articulationMatrix) !== JSON.stringify(initialMatrix);
    
    setIsDirty(coursesChanged || posChanged || psosChanged || matrixChanged);
  }, [courses, pos, psos, articulationMatrix, initialCourses, initialPos, initialPsos, initialMatrix]);


  useEffect(() => {
    setCourses(assignedCourses);
    if (assignedCourses.length > 0 && !assignedCourses.some(c => c.id === selectedCourseId)) {
        setSelectedCourseId(assignedCourses[0].id);
    } else if (assignedCourses.length === 0) {
        setSelectedCourseId('');
    }
  }, [assignedCourses, selectedCourseId]);

  const selectedCourse = courses.find(c => c.id === selectedCourseId);
  const allOutcomes = useMemo(() => [...pos, ...psos], [pos, psos]);

  const outcomeAverages = useMemo(() => {
    if (!selectedCourse) return {};
    const courseMatrix = articulationMatrix[selectedCourse.id];
    if (!courseMatrix) return {};

    const averages = {};
    allOutcomes.forEach(outcome => {
        let sum = 0;
        let count = 0;
        selectedCourse.cos.forEach(co => {
            const value = courseMatrix[co.id]?.[outcome.id];
            if (value && value > 0) {
                sum += value;
                count++;
            }
        });
        if (count > 0) {
            averages[outcome.id] = sum / count;
        }
    });
    return averages;
}, [selectedCourse, articulationMatrix, allOutcomes]);


  const handleMatrixChange = (coId, outcomeId, value) => {
    if (!selectedCourse) return;

    const correlation = parseInt(value, 10);
    const newCorrelation = !isNaN(correlation) ? Math.max(0, Math.min(3, correlation)) : 0;

    setArticulationMatrix(prevMatrix => {
        const courseMatrix = prevMatrix[selectedCourse.id] || {};
        const coMatrix = courseMatrix[coId] || {};

        return {
            ...prevMatrix,
            [selectedCourse.id]: {
                ...courseMatrix,
                [coId]: {
                    ...coMatrix,
                    [outcomeId]: newCorrelation,
                },
            },
        };
    });
  };

    const handleFileChange = (event) => {
        if (event.target.files && event.target.files.length > 0) {
            setSyllabusFile(event.target.files[0]);
        } else {
            setSyllabusFile(null);
        }
    };

    const handleGenerateMatrix = () => {
        if (!selectedCourse || !syllabusFile) return;

        // Dummy AI generation logic
        const courseMatrix = {};
        selectedCourse.cos.forEach(co => {
            const coMatrix = {};
            const numMappings = Math.floor(Math.random() * 4) + 2; // 2 to 5 mappings per CO
            
            const shuffledOutcomes = [...allOutcomes].sort(() => 0.5 - Math.random());

            for (let i = 0; i < numMappings; i++) {
                if (i < shuffledOutcomes.length) {
                    const outcome = shuffledOutcomes[i];
                    coMatrix[outcome.id] = Math.floor(Math.random() * 3) + 1; // Correlation 1, 2, or 3
                }
            }
            courseMatrix[co.id] = coMatrix;
        });

        setArticulationMatrix(prevMatrix => ({
            ...prevMatrix,
            [selectedCourse.id]: courseMatrix,
        }));
        
        setSyllabusFile(null);
        const fileInput = document.getElementById('syllabus-upload');
        if (fileInput) fileInput.value = '';
    };

  const handleAddCo = () => {
    if (!selectedCourse) return;
    const newCoNumber = selectedCourse.cos.length > 0 ? Math.max(...selectedCourse.cos.map(co => parseInt(co.id.split('.')[1]))) + 1 : 1;
    
    const newCo = {
        id: `${selectedCourse.id}.${newCoNumber}`,
        description: 'New Course Outcome',
        kLevel: 'Kx'
    };

    const newCourses = courses.map(course => 
        course.id === selectedCourseId ? { ...course, cos: [...course.cos, newCo] } : course
    );
    setCourses(newCourses);
  };
  
  const handleDeleteCo = (coId) => {
    if (!selectedCourse) return;
    const newCourses = courses.map(course => 
        course.id === selectedCourseId ? { ...course, cos: course.cos.filter(co => co.id !== coId) } : course
    );
    setCourses(newCourses);

    const newMatrix = { ...articulationMatrix };
    if (newMatrix[selectedCourseId] && newMatrix[selectedCourseId][coId]) {
        delete newMatrix[selectedCourseId][coId];
        setArticulationMatrix(newMatrix);
    }
  };

  const handleAddPo = () => {
    const newPoId = `PO${pos.length + 1}`;
    setPos([...pos, { id: newPoId, description: 'New Program Outcome' }]);
  };
  
  const handleAddPso = () => {
    const newPsoId = `PSO${psos.length + 1}`;
    setPsos([...psos, { id: newPsoId, description: 'New Program Specific Outcome' }]);
  };

  const requestDeleteOutcome = (outcomeId) => {
    setDeleteConfirmation({ isOpen: true, outcomeId });
  };

  const confirmDeleteOutcome = () => {
    const { outcomeId } = deleteConfirmation;
    if (!outcomeId) return;

    if (outcomeId.startsWith('PO')) {
        setPos(prev => prev.filter(p => p.id !== outcomeId));
    } else {
        setPsos(prev => prev.filter(p => p.id !== outcomeId));
    }

    const newMatrix = { ...articulationMatrix };
    Object.keys(newMatrix).forEach(courseId => {
        Object.keys(newMatrix[courseId]).forEach(coId => {
            if (newMatrix[courseId][coId][outcomeId] !== undefined) {
                delete newMatrix[courseId][coId][outcomeId];
            }
        });
    });
    setArticulationMatrix(newMatrix);
    
    cancelDeleteOutcome();
  };

  const cancelDeleteOutcome = () => {
    setDeleteConfirmation({ isOpen: false, outcomeId: null });
  };

  const handleSaveChanges = () => {
    // In a real app, this would be an API call.
    // Here, we're just updating the 'initial' state to reflect the new saved state.
    setInitialCourses(courses);
    setInitialPos(pos);
    setInitialPsos(psos);
    setInitialMatrix(articulationMatrix);
    // isDirty will be set to false by the useEffect hook after this.
    alert('Changes saved successfully!');
  };

  return (
    <div className="space-y-6">
      {deleteConfirmation.isOpen && <ConfirmationModal onConfirm={confirmDeleteOutcome} onCancel={cancelDeleteOutcome} />}
      <h1 className="text-3xl font-bold text-gray-800 dark:text-white">CO-PO/PSO Articulation Matrix</h1>
      <Card>
        <CardHeader>
           <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between">
                <div className="flex-grow">
                  <CardTitle>Course Articulation</CardTitle>
                  <CardDescription>Mapping of Course Outcomes (COs) to Program Outcomes (POs) and Program Specific Outcomes (PSOs).</CardDescription>
                </div>
                <div className="mt-4 sm:mt-0 sm:ml-4 flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
                  <select
                    id="course-select"
                    value={selectedCourseId}
                    onChange={(e) => {
                        setSelectedCourseId(e.target.value);
                        setSyllabusFile(null); // Reset file on course change
                    }}
                    className="block w-full sm:w-64 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    disabled={courses.length === 0}
                  >
                    {courses.length > 0 ? courses.map(course => (
                      <option key={course.id} value={course.id}>{course.code} - {course.name}</option>
                    )) : <option>No courses assigned</option>}
                  </select>
                   <div className="flex gap-2 justify-end">
                    <button onClick={handleAddPo} className="flex items-center gap-1 px-3 py-2 text-xs font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700">
                        <Icons.PlusCircle className="h-4 w-4" /> PO
                    </button>
                    <button onClick={handleAddPso} className="flex items-center gap-1 px-3 py-2 text-xs font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700">
                        <Icons.PlusCircle className="h-4 w-4" /> PSO
                    </button>
                    <button
                        onClick={handleSaveChanges}
                        disabled={!isDirty}
                        className="px-4 py-2 text-xs font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                        aria-label="Save Changes"
                    >
                        Save Changes
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="border-t dark:border-gray-700 pt-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
                    <div className="flex-shrink-0">
                        <span className="font-semibold text-sm text-primary-700 dark:text-primary-200">✨ Generate with AI</span>
                    </div>
                    <div className="flex-grow text-xs text-primary-600 dark:text-primary-300">
                        Upload your syllabus file (.pdf, .docx) and let AI populate the articulation matrix for you.
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto">
                        <input
                            type="file"
                            id="syllabus-upload"
                            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                            onChange={handleFileChange}
                            className="hidden"
                        />
                        <label htmlFor="syllabus-upload" className="cursor-pointer text-sm text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-700 border dark:border-gray-600 rounded-md px-3 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-600 truncate max-w-xs">
                           {syllabusFile ? syllabusFile.name : 'Choose a file...'}
                        </label>
                        <button
                            onClick={handleGenerateMatrix}
                            disabled={!syllabusFile || !selectedCourse}
                            className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                        >
                            Generate
                        </button>
                    </div>
                </div>
              </div>
           </div>
        </CardHeader>
        <CardContent>
          {selectedCourse ? (
            <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 border dark:border-gray-600">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th scope="col" className="sticky left-0 bg-gray-50 dark:bg-gray-700 px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider border-r dark:border-gray-600">
                      COs
                    </th>
                    {allOutcomes.map(outcome => (
                      <th key={outcome.id} scope="col" className="px-3 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        <div className="flex items-center justify-center gap-1">
                          <span>{outcome.id}</span>
                          <button onClick={() => requestDeleteOutcome(outcome.id)} className="text-gray-400 hover:text-red-500 dark:hover:text-red-400">
                            <Icons.Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </th>
                    ))}
                    <th scope="col" className="px-3 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {selectedCourse.cos.map(co => (
                    <tr key={co.id}>
                      <td className="sticky left-0 bg-white dark:bg-gray-800 px-4 py-4 text-sm font-medium text-gray-900 dark:text-white border-r dark:border-gray-600 w-64">
                        <div className="font-bold">{co.id.split('.')[1]}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 max-w-xs truncate" title={co.description}>{co.description}</div>
                      </td>
                      {allOutcomes.map(outcome => (
                        <td key={outcome.id} className="px-3 py-4 whitespace-nowrap text-center text-sm">
                          <input
                            type="text"
                            value={articulationMatrix[selectedCourse.id]?.[co.id]?.[outcome.id] || ''}
                            onChange={(e) => handleMatrixChange(co.id, outcome.id, e.target.value)}
                            className="w-10 h-10 text-center border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-primary-500 focus:border-primary-500"
                            aria-label={`Mapping for ${co.id} to ${outcome.id}`}
                          />
                        </td>
                      ))}
                      <td className="px-3 py-4 whitespace-nowrap text-center text-sm">
                          <button onClick={() => handleDeleteCo(co.id)} className="text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400">
                              <Icons.Trash2 className="h-4 w-4" />
                          </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t-2 border-gray-300 dark:border-gray-600">
                  <tr className="bg-red-50 dark:bg-red-900/20">
                    <td className="sticky left-0 bg-red-50 dark:bg-red-900/20 px-4 py-4 text-sm font-bold text-gray-900 dark:text-white border-r dark:border-gray-600">
                      AVERAGE
                    </td>
                    {allOutcomes.map(outcome => {
                      const avg = outcomeAverages[outcome.id];
                      const displayValue = avg ? (avg % 1 === 0 ? avg.toString() : avg.toFixed(1)) : '-';
                      return (
                        <td key={`avg-${outcome.id}`} className="px-3 py-4 whitespace-nowrap text-center text-sm font-bold text-gray-800 dark:text-gray-100">
                          {displayValue}
                        </td>
                      );
                    })}
                    <td className="px-3 py-4">
                      {/* Empty cell for actions column */}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <div className="mt-4">
                <button onClick={handleAddCo} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700">
                    <Icons.PlusCircle className="h-4 w-4" /> Add Course Outcome (CO)
                </button>
            </div>
          </>
          ) : (
            <div className="text-center py-10 text-gray-500 dark:text-gray-400">
                Please select a course to view its articulation matrix, or contact your admin if no courses are assigned to you.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ArticulationMatrixPage;