import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../shared/Card';
import { Icons } from '../shared/icons';
import { useAuth } from '../../../contexts/AuthContext';
import api from '../../../services/api';

const FacultyConfigurationPage = () => {
    const { user } = useAuth();
    
    // --- 1. Course Selection Logic ---
    const [courses, setCourses] = useState([]);
    const [selectedCourseId, setSelectedCourseId] = useState('');
    const [activeTab, setActiveTab] = useState('cos'); // 'cos' or 'assessments'
    const [loading, setLoading] = useState(true);

    // --- 2. Configuration State ---
    const [coDefinitions, setCoDefinitions] = useState([]);
    const [courseSettings, setCourseSettings] = useState({
        targetThreshold: 60,
        courseType: 'Theory',
    });
    const [assessmentTools, setAssessmentTools] = useState([]);

    // Fetch courses on mount
    useEffect(() => {
        const fetchCourses = async () => {
            if (!user) return;
            try {
                setLoading(true);
                const res = await api.get(`/courses?assignedFacultyId=${user.id}`);
                setCourses(res.data);
                if (res.data.length > 0) {
                    setSelectedCourseId(res.data[0].id);
                }
            } catch (error) {
                console.error("Failed to load courses", error);
            } finally {
                setLoading(false);
            }
        };
        fetchCourses();
    }, [user]);

    // Load Configuration when Course Changes
    useEffect(() => {
        if (!selectedCourseId) return;

        const course = courses.find(c => c.id === selectedCourseId);
        if (course) {
            setCoDefinitions(course.cos || []);
            setCourseSettings(course.settings || { targetThreshold: 60, courseType: 'Theory' });
            setAssessmentTools(course.assessmentTools || []);
        }
    }, [selectedCourseId, courses]);

    const selectedCourse = courses.find(c => c.id === selectedCourseId);

    // --- Handlers: CO Management ---
    const addCo = () => {
        const nextNum = coDefinitions.length + 1;
        setCoDefinitions([...coDefinitions, { 
            id: `CO${nextNum}`, 
            description: '', 
            modules: '', 
            kLevel: 'K1' 
        }]);
    };

    const removeCo = (id) => {
        if (window.confirm(`Delete ${id}? This will remove it from all assessments.`)) {
            setCoDefinitions(coDefinitions.filter(co => co.id !== id));
            // Also cleanup assessments
            setAssessmentTools(tools => tools.map(t => {
                const newDist = { ...t.coDistribution };
                delete newDist[id];
                return { ...t, coDistribution: newDist };
            }));
        }
    };

    const updateCo = (idx, field, value) => {
        const updated = [...coDefinitions];
        updated[idx][field] = value;
        setCoDefinitions(updated);
    };

    // --- Handlers: Assessment Tools ---
    const addTool = () => {
        const newId = Date.now().toString();
        setAssessmentTools([
            ...assessmentTools, 
            { id: newId, name: 'New Assessment', maxMarks: 0, weightage: 0, coDistribution: {} }
        ]);
    };

    const removeTool = (id) => {
        if (window.confirm('Are you sure you want to remove this assessment tool?')) {
            setAssessmentTools(assessmentTools.filter(t => t.id !== id));
        }
    };

    const updateTool = (id, field, value) => {
        setAssessmentTools(tools => tools.map(t => 
            t.id === id ? { ...t, [field]: value } : t
        ));
    };

    const updateToolCoDistribution = (toolId, coId, marks) => {
        const markValue = parseInt(marks) || 0;
        setAssessmentTools(tools => tools.map(t => {
            if (t.id !== toolId) return t;
            
            const newDist = { ...t.coDistribution };
            if (markValue > 0) {
                newDist[coId] = markValue;
            } else {
                delete newDist[coId];
            }
            return { ...t, coDistribution: newDist };
        }));
    };

    const handleSave = async () => {
        if (!selectedCourseId) return;

        // Validation
        const errors = [];
        assessmentTools.forEach(tool => {
            const allocated = Object.values(tool.coDistribution).reduce((a, b) => a + b, 0);
            if (allocated !== tool.maxMarks) {
                errors.push(`${tool.name}: Allocated ${allocated} marks, but Max Marks is ${tool.maxMarks}`);
            }
        });

        if (errors.length > 0) {
            alert(`Configuration Error:\n\n${errors.join('\n')}\n\nPlease correct the configuration.`);
            return;
        }

        try {
            const payload = {
                cos: coDefinitions,
                settings: courseSettings,
                assessmentTools: assessmentTools
            };

            await api.patch(`/courses/${selectedCourseId}`, payload);
            
            // Update local state to reflect successful save (optional but good practice)
            setCourses(prev => prev.map(c => c.id === selectedCourseId ? { ...c, ...payload } : c));
            
            alert(`Configuration for ${selectedCourse?.code} saved successfully!`);
        } catch (error) {
            console.error("Failed to save configuration", error);
            alert("Error saving configuration.");
        }
    };

    if (!user) return null;
    if (loading && courses.length === 0) return <div className="p-12 text-center text-gray-500">Loading courses...</div>;

    return (
        <div className="p-6 space-y-6 pb-10">
            {/* Header & Course Selector */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Course Configuration</h1>
                    <p className="text-gray-600 dark:text-gray-300 mt-1 font-medium">Manage COs, Modules, and Assessment Planning.</p>
                </div>
                <div className="flex gap-3">
                     <select
                        value={selectedCourseId}
                        onChange={(e) => setSelectedCourseId(e.target.value)}
                        className="block w-full sm:w-64 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-gray-900 font-bold dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        disabled={courses.length === 0}
                    >
                        {courses.length > 0 ? courses.map(course => (
                            <option key={course.id} value={course.id}>{course.code} - {course.name}</option>
                        )) : <option>No courses assigned</option>}
                    </select>
                    <button 
                        onClick={handleSave}
                        disabled={!selectedCourse}
                        className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-bold disabled:opacity-50"
                    >
                        <Icons.Settings className="h-4 w-4" /> Save All
                    </button>
                </div>
            </div>

            {selectedCourse ? (
                <>
                    {/* Navigation Tabs */}
                    <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
                        <nav className="-mb-px flex space-x-8">
                            <button
                                onClick={() => setActiveTab('cos')}
                                className={`${
                                    activeTab === 'cos'
                                        ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400'
                                } whitespace-nowrap py-4 px-1 border-b-2 font-bold text-sm`}
                            >
                                1. CO & Syllabus Definition
                            </button>
                            <button
                                onClick={() => setActiveTab('assessments')}
                                className={`${
                                    activeTab === 'assessments'
                                        ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400'
                                } whitespace-nowrap py-4 px-1 border-b-2 font-bold text-sm`}
                            >
                                2. Assessment & Scaling Plan
                            </button>
                        </nav>
                    </div>

                    {/* --- TAB 1: CO MANAGEMENT --- */}
                    {activeTab === 'cos' && (
                        <div className="space-y-6">
                            <Card>
                                <CardHeader>
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <CardTitle>Course Outcomes (COs) & Syllabus Mapping</CardTitle>
                                            <CardDescription>Define the COs and map them to the specific modules in your syllabus.</CardDescription>
                                        </div>
                                        <button onClick={addCo} className="flex items-center gap-2 px-3 py-1.5 bg-primary-50 border border-primary-200 text-primary-700 rounded-lg hover:bg-primary-100 text-sm font-bold dark:bg-primary-900/20 dark:border-primary-800 dark:text-primary-300">
                                            <Icons.PlusCircle className="h-4 w-4" /> Add CO
                                        </button>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                            <thead className="bg-gray-50 dark:bg-gray-700/50">
                                                <tr>
                                                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase w-20 dark:text-gray-200">ID</th>
                                                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase dark:text-gray-200">CO Description</th>
                                                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase w-48 dark:text-gray-200">Modules Covered</th>
                                                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase w-32 dark:text-gray-200">Bloom's Level</th>
                                                    <th className="px-4 py-3 text-right text-xs font-bold text-gray-700 uppercase w-20 dark:text-gray-200">Action</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                                {coDefinitions.map((co, idx) => (
                                                    <tr key={idx} className="bg-white dark:bg-gray-800">
                                                        <td className="px-4 py-3 align-top">
                                                            <input 
                                                                value={co.id}
                                                                onChange={(e) => updateCo(idx, 'id', e.target.value)}
                                                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 font-bold text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                                            />
                                                        </td>
                                                        <td className="px-4 py-3 align-top">
                                                            <textarea 
                                                                rows={2}
                                                                value={co.description}
                                                                onChange={(e) => updateCo(idx, 'description', e.target.value)}
                                                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-white resize-none"
                                                                placeholder="Enter CO statement..."
                                                            />
                                                        </td>
                                                        <td className="px-4 py-3 align-top">
                                                             <input 
                                                                value={co.modules}
                                                                onChange={(e) => updateCo(idx, 'modules', e.target.value)}
                                                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                                                placeholder="e.g. Module 1, 2"
                                                            />
                                                        </td>
                                                        <td className="px-4 py-3 align-top">
                                                            <select 
                                                                value={co.kLevel}
                                                                onChange={(e) => updateCo(idx, 'kLevel', e.target.value)}
                                                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                                            >
                                                                {['K1', 'K2', 'K3', 'K4', 'K5', 'K6'].map(k => <option key={k} value={k}>{k}</option>)}
                                                            </select>
                                                        </td>
                                                        <td className="px-4 py-3 align-top text-right">
                                                            <button 
                                                                onClick={() => removeCo(co.id)}
                                                                className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30"
                                                                title="Delete CO"
                                                            >
                                                                <Icons.Trash2 className="h-4 w-4" />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </CardContent>
                            </Card>

                             {/* Global Parameters */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Global Course Parameters</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-sm font-bold text-gray-800 dark:text-gray-200 mb-2">Course Type</label>
                                            <select 
                                                value={courseSettings.courseType}
                                                onChange={(e) => setCourseSettings({...courseSettings, courseType: e.target.value})}
                                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 font-medium dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                            >
                                                <option value="Theory">Theory Only</option>
                                                <option value="Integrated">Integrated (Theory + Lab)</option>
                                                <option value="Lab">Laboratory Only</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-gray-800 dark:text-gray-200 mb-2">Student Pass Threshold (%)</label>
                                            <input 
                                                type="number" 
                                                min="0" max="100"
                                                value={courseSettings.targetThreshold}
                                                onChange={(e) => setCourseSettings({...courseSettings, targetThreshold: parseInt(e.target.value)})}
                                                className="w-full rounded-md border-gray-300 shadow-sm font-bold dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                            />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {/* --- TAB 2: ASSESSMENT PLANNING --- */}
                    {activeTab === 'assessments' && (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Assessment Tools & Scaling</h2>
                                <button 
                                    onClick={addTool}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-400 text-gray-800 rounded-lg hover:bg-gray-100 text-sm font-bold shadow-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:hover:bg-gray-700"
                                >
                                    <Icons.PlusCircle className="h-4 w-4" /> Add Tool
                                </button>
                            </div>

                            {assessmentTools.map((tool) => {
                                const allocated = Object.values(tool.coDistribution).reduce((a, b) => a + b, 0);
                                const isBalanced = allocated === tool.maxMarks;
                                
                                return (
                                    <Card key={tool.id} className={`transition-all border-l-4 ${!isBalanced ? 'border-amber-400 dark:border-amber-600' : 'border-l-primary-600'}`}>
                                        <CardContent className="p-4 sm:p-6">
                                            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                                                
                                                {/* Left: Tool Details */}
                                                <div className="md:col-span-4 space-y-4">
                                                    <div>
                                                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1 dark:text-gray-300">Name</label>
                                                        <input 
                                                            type="text" 
                                                            value={tool.name}
                                                            onChange={(e) => updateTool(tool.id, 'name', e.target.value)}
                                                            className="block w-full rounded-md border-gray-300 shadow-sm text-sm font-bold text-gray-900 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                                                            placeholder="e.g. IA1"
                                                        />
                                                    </div>
                                                    
                                                    <div className="grid grid-cols-2 gap-3 bg-gray-50 dark:bg-gray-700/30 p-3 rounded-lg border border-gray-200 dark:border-gray-600">
                                                        <div>
                                                            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1 dark:text-gray-400">Conducted</label>
                                                            <input 
                                                                type="number" 
                                                                value={tool.maxMarks}
                                                                onChange={(e) => updateTool(tool.id, 'maxMarks', parseInt(e.target.value))}
                                                                className="block w-full rounded-md border-gray-300 shadow-sm text-sm font-bold text-gray-900 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-[10px] font-bold text-primary-600 uppercase mb-1 dark:text-primary-400">Weightage</label>
                                                            <input 
                                                                type="number" 
                                                                value={tool.weightage}
                                                                onChange={(e) => updateTool(tool.id, 'weightage', parseInt(e.target.value))}
                                                                className="block w-full rounded-md border-primary-300 shadow-sm text-sm font-bold text-primary-700 bg-primary-50 dark:bg-gray-800 dark:border-primary-500 dark:text-white"
                                                            />
                                                        </div>
                                                    </div>

                                                    <button 
                                                        onClick={() => removeTool(tool.id)}
                                                        className="text-red-600 hover:text-red-800 font-bold text-xs w-full text-left pl-1 dark:text-red-400"
                                                    >
                                                        Remove Tool
                                                    </button>
                                                </div>

                                                {/* Right: CO Distribution */}
                                                <div className="md:col-span-8 border-l border-gray-200 dark:border-gray-700 pl-0 md:pl-6 pt-4 md:pt-0">
                                                    <div className="flex justify-between items-center mb-3">
                                                        <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200">
                                                            Marks Distribution (on Conducted Marks)
                                                        </h3>
                                                        <span className={`text-xs font-bold px-2 py-1 rounded border ${isBalanced ? 'bg-green-100 text-green-800 border-green-200' : 'bg-amber-100 text-amber-900 border-amber-300'}`}>
                                                            {allocated} / {tool.maxMarks} Allocated
                                                        </span>
                                                    </div>
                                                    
                                                    {coDefinitions.length === 0 ? (
                                                        <div className="text-center py-4 text-sm text-gray-500 italic bg-gray-50 rounded border border-dashed border-gray-300">
                                                            No COs defined. Go to "CO & Syllabus Definition" tab first.
                                                        </div>
                                                    ) : (
                                                        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                                                            {coDefinitions.map((co) => (
                                                                <div key={co.id} className="relative group">
                                                                    <div className="flex flex-col">
                                                                        <span className="text-xs font-bold text-gray-700 text-center mb-1 dark:text-gray-400">
                                                                            {co.id}
                                                                        </span>
                                                                        <input 
                                                                            type="number"
                                                                            min="0"
                                                                            placeholder="-"
                                                                            value={tool.coDistribution[co.id] || ''}
                                                                            onChange={(e) => updateToolCoDistribution(tool.id, co.id, e.target.value)}
                                                                            className={`block w-full text-center rounded-md text-sm font-bold focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-800 dark:text-white ${
                                                                                (tool.coDistribution[co.id] > 0) 
                                                                                    ? 'border-primary-400 bg-primary-50 text-primary-900 dark:bg-primary-900/20 dark:text-primary-100' 
                                                                                    : 'border-gray-300 text-gray-900 dark:border-gray-600'
                                                                            }`}
                                                                        />
                                                                        {co.modules && (
                                                                            <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 hidden group-hover:block bg-gray-800 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap z-10 shadow-lg">
                                                                                {co.modules}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                    
                                                    {!isBalanced && (
                                                        <p className="text-xs font-semibold text-amber-700 mt-2 dark:text-amber-500">
                                                            * Allocation must match Conducted Marks ({tool.maxMarks}).
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    )}
                </>
            ) : (
                <div className="text-center py-20 text-gray-600 bg-white dark:bg-gray-800 rounded-lg shadow font-medium">
                    Select a course to begin configuration.
                </div>
            )}
        </div>
    );
};

export default FacultyConfigurationPage;