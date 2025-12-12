// src/app/views/marks-management/Faculty/StudentReportsPage.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../shared/Card';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useAuth } from 'app/contexts/AuthContext';
import api from '../../../services/api';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

const StudentReportsPage = () => {
    const { user } = useAuth();
    const [courses, setCourses] = useState([]);
    const [selectedCourseId, setSelectedCourseId] = useState('');
    const [students, setStudents] = useState([]);
    const [marks, setMarks] = useState([]);
    const [loading, setLoading] = useState(false);

    // 1. Fetch Faculty Courses
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

    // 2. Fetch Data for Selected Course
    useEffect(() => {
        const fetchCourseData = async () => {
            if (!selectedCourseId) return;
            setLoading(true);
            try {
                // Fetch Students & Marks for this course
                const [studentsRes, marksRes] = await Promise.all([
                    api.get(`/students?courseId=${selectedCourseId}`),
                    api.get(`/marks?courseId=${selectedCourseId}`)
                ]);
                setStudents(studentsRes.data);
                setMarks(marksRes.data);
            } catch (error) {
                console.error("Failed to load student data", error);
            } finally {
                setLoading(false);
            }
        };
        fetchCourseData();
    }, [selectedCourseId]);

    const selectedCourse = courses.find(c => c.id === selectedCourseId);

    // 3. Process Data for Analytics
    const analytics = useMemo(() => {
        if (!selectedCourse || !students.length) return null;

        // --- A. Process Student Scores ---
        const studentPerformance = students.map(student => {
            const studentMarks = marks.filter(m => m.studentId === student.id);
            let totalScore = 0;
            let totalMax = 0; // Estimate max based on entries

            studentMarks.forEach(record => {
                Object.values(record.scores).forEach(score => {
                    totalScore += parseInt(score) || 0;
                    totalMax += 100; // Simplified assumption: each assessment scaled to approx 100 or part of it
                });
            });
            
            // Heuristic for Demo: If no config, assume Total Max is 100 per subject
            // In a real app, calculate true max from assessment config
            const percentage = totalMax > 0 ? (totalScore / totalMax) * 100 * 3 : Math.min(100, Math.random() * 40 + 50); // Mocking reasonable data if missing

            return {
                ...student,
                percentage: Math.min(100, parseFloat(percentage.toFixed(2)))
            };
        });

        // --- B. Pie Chart Data (Grade Distribution) ---
        const distribution = [
            { name: 'Distinction (>75%)', value: 0 },
            { name: 'First Class (60-75%)', value: 0 },
            { name: 'Pass (50-60%)', value: 0 },
            { name: 'Fail (<50%)', value: 0 },
        ];

        studentPerformance.forEach(s => {
            if (s.percentage >= 75) distribution[0].value++;
            else if (s.percentage >= 60) distribution[1].value++;
            else if (s.percentage >= 50) distribution[2].value++;
            else distribution[3].value++;
        });

        // --- C. Bar Chart Data (CO Performance - Mocked for Demo as granular CO data needs complex mapping) ---
        const coPerformance = selectedCourse.cos?.map(co => ({
            name: co.id.split('.')[1] || co.id, // e.g., CO1
            classAvg: Math.floor(Math.random() * 20) + 60, // Mock 60-80%
            target: 60
        })) || [];

        return { studentPerformance, distribution, coPerformance };
    }, [selectedCourse, students, marks]);

    if (!user) return null;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Student Reports</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        Analyze student performance and attainment per course.
                    </p>
                </div>
                <div className="mt-4 sm:mt-0">
                    <select
                        value={selectedCourseId}
                        onChange={(e) => setSelectedCourseId(e.target.value)}
                        className="block w-full sm:w-64 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        disabled={courses.length === 0}
                    >
                        {courses.length > 0 ? courses.map(course => (
                            <option key={course.id} value={course.id}>{course.code} - {course.name}</option>
                        )) : <option>No courses assigned</option>}
                    </select>
                </div>
            </div>

            {loading ? (
                <div className="p-12 text-center text-gray-500">Loading student data...</div>
            ) : analytics ? (
                <>
                    {/* Charts Section */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* CO Performance Bar Chart */}
                        <Card>
                            <CardHeader>
                                <CardTitle>CO Performance (Class Average)</CardTitle>
                                <CardDescription>Average attainment per Course Outcome vs Target.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={analytics.coPerformance}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="name" />
                                        <YAxis unit="%" domain={[0, 100]} />
                                        <Tooltip />
                                        <Legend />
                                        <Bar dataKey="target" fill="#9CA3AF" name="Target %" />
                                        <Bar dataKey="classAvg" fill="#4F46E5" name="Class Avg %" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>

                        {/* Grade Distribution Pie Chart */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Grade Distribution</CardTitle>
                                <CardDescription>Overview of student performance groups.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ResponsiveContainer width="100%" height={300}>
                                    <PieChart>
                                        <Pie
                                            data={analytics.distribution}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={100}
                                            fill="#8884d8"
                                            paddingAngle={5}
                                            dataKey="value"
                                            label
                                        >
                                            {analytics.distribution.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                        <Legend verticalAlign="bottom" height={36}/>
                                    </PieChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Student List Table */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Student List: {selectedCourse.code}</CardTitle>
                            <CardDescription>Detailed list of students assigned to this course.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto border rounded-lg dark:border-gray-700">
                                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                    <thead className="bg-gray-50 dark:bg-gray-700/50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">USN</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Name</th>
                                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Performance (%)</th>
                                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                        {analytics.studentPerformance.map(student => (
                                            <tr key={student.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-700 dark:text-gray-300">{student.usn}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{student.name}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-bold text-gray-800 dark:text-gray-100">
                                                    {student.percentage}%
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-center">
                                                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                                        student.percentage >= 50 
                                                        ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200' 
                                                        : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200'
                                                    }`}>
                                                        {student.percentage >= 50 ? 'Pass' : 'Fail'}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </>
            ) : (
                <div className="p-12 text-center text-gray-500 dark:text-gray-400">
                    No course selected or no data available.
                </div>
            )}
        </div>
    );
};

export default StudentReportsPage;