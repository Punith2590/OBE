import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../shared/Card';
import { useAuth } from '../../../contexts/AuthContext';
import api from '../../../services/api';

const CourseAssignment = () => {
    const { user } = useAuth();
    const [courses, setCourses] = useState([]);
    const [faculty, setFaculty] = useState([]);
    const [loading, setLoading] = useState(true);

    // 1. Fetch Data (Courses & Faculty)
    useEffect(() => {
        const fetchData = async () => {
            if (!user) return;

            try {
                setLoading(true);
                
                // Fetch Faculty: Filter by role 'faculty' and the logged-in admin's department
                const facultyResponse = await api.get(`/users?role=faculty&departmentId=${user.departmentId}`);
                setFaculty(facultyResponse.data);

                // Fetch Courses: In a real app, you might also filter these by department
                const coursesResponse = await api.get('/courses');
                
                // Sort courses for better readability
                const sortedCourses = coursesResponse.data.sort((a, b) => 
                    a.semester - b.semester || a.code.localeCompare(b.code)
                );
                setCourses(sortedCourses);

            } catch (error) {
                console.error("Failed to load data", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [user]);

    // 2. Handle Assignment Change (Live Update)
    const handleAssignmentChange = async (courseId, facultyId) => {
        try {
            // API Call: Patch the course with the new assignedFacultyId
            await api.patch(`/courses/${courseId}`, { 
                assignedFacultyId: facultyId || null // Send null if "Unassigned" is selected
            });

            // Update Local State to reflect change immediately
            setCourses(prevCourses => prevCourses.map(course => 
                course.id === courseId 
                    ? { ...course, assignedFacultyId: facultyId } 
                    : course
            ));

        } catch (error) {
            console.error("Failed to assign course", error);
            alert("Failed to update assignment. Please try again.");
        }
    };

    return (
     <div className="p-6">
        <Card>
            <CardHeader>
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle>Assign Courses</CardTitle>
                        <CardDescription>Assign courses to faculty members for the upcoming semester.</CardDescription>
                    </div>
                    {/* Optional: You can keep a 'Refresh' button or remove this if live updates are sufficient */}
                    <div className="px-3 py-1 text-xs font-medium text-green-700 bg-green-100 rounded-full dark:bg-green-900/30 dark:text-green-400">
                        Autosave Enabled
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="text-center py-12 text-gray-500">Loading assignments...</div>
                ) : (
                    <div className="overflow-x-auto border rounded-lg dark:border-gray-700">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-700/50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Course Code</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Course Name</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Assigned Faculty</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                {courses.length === 0 ? (
                                    <tr>
                                        <td colSpan="3" className="px-6 py-8 text-center text-sm text-gray-500">
                                            No courses found. Go to "Manage Courses" to add some.
                                        </td>
                                    </tr>
                                ) : (
                                    courses.map(course => (
                                        <tr key={course.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-700 dark:text-gray-300">
                                                {course.code}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                                                {course.name}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                                                <select 
                                                    value={course.assignedFacultyId || ''} 
                                                    onChange={(e) => handleAssignmentChange(course.id, e.target.value)}
                                                    className="block w-full max-w-xs rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white transition-colors"
                                                >
                                                    <option value="">Unassigned</option>
                                                    {faculty.map(f => (
                                                        <option key={f.id} value={f.id}>
                                                            {f.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </CardContent>
        </Card>
    </div>
    );
};

export default CourseAssignment;