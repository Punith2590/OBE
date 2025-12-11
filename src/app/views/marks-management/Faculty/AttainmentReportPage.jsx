import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../shared/Card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { courses as mockCourses, coAttainmentData, poAttainmentData, attainmentSummary } from '../data/mockData';
import { useAuth } from 'app/contexts/AuthContext';

const AttainmentReportPage = () => {
  const { user } = useAuth();
  
  const assignedCourses = useMemo(() => {
    if (!user) return [];
    return mockCourses.filter(c => c.assignedFacultyId === user.id);
  }, [user]);

  const [selectedCourseId, setSelectedCourseId] = useState(assignedCourses[0]?.id ?? '');

  useEffect(() => {
    if (assignedCourses.length > 0 && !assignedCourses.some(c => c.id === selectedCourseId)) {
        setSelectedCourseId(assignedCourses[0].id);
    } else if (assignedCourses.length === 0) {
        setSelectedCourseId('');
    }
  }, [assignedCourses, selectedCourseId]);

  const selectedCourse = assignedCourses.find(c => c.id === selectedCourseId);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Attainment Reports & Analytics</h1>
      
      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <select className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
          <option>2023-2024</option>
          <option>2022-2023</option>
        </select>
        <select className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
          <option>Semester 3</option>
          <option>Semester 4</option>
        </select>
        <select 
          value={selectedCourseId}
          onChange={(e) => setSelectedCourseId(e.target.value)}
          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          disabled={assignedCourses.length === 0}
        >
          {assignedCourses.length > 0 ? assignedCourses.map(course => (
            <option key={course.id} value={course.id}>{course.code} - {course.name}</option>
          )) : <option>No courses assigned</option>}
        </select>
      </div>
      
      {selectedCourse ? (
        <>
          {/* CO Attainment */}
          <Card>
            <CardHeader>
              <CardTitle>Course Outcome (CO) Attainment</CardTitle>
              <CardDescription>
                Attainment levels for each CO in {selectedCourse.code}. The target is {coAttainmentData[0].target}%.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={coAttainmentData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} label={{ value: 'Course Outcomes', position: 'insideBottom', offset: -5 }} />
                  <YAxis fontSize={12} tickLine={false} axisLine={false} unit="%" />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="target" fill="#93c5fd" name="Target Level" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="attained" fill="#1d4ed8" name="Attained Level" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          
          {/* PO Attainment */}
          <Card>
            <CardHeader>
              <CardTitle>Program Outcome (PO) Attainment through {selectedCourse.code}</CardTitle>
              <CardDescription>
                Contribution of this course to the overall Program Outcome attainment.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={poAttainmentData.slice(0, 6)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false}/>
                  <XAxis type="number" unit="%" fontSize={12} tickLine={false} axisLine={false}/>
                  <YAxis type="category" dataKey="name" width={80} fontSize={12} tickLine={false} axisLine={false}/>
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="attained" name="Attainment Level" fill="#2563eb" radius={[0, 4, 4, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          
          {/* Final Evaluation */}
          <Card>
              <CardHeader>
                  <CardTitle>Consolidated Evaluation</CardTitle>
                  <CardDescription>Final attainment scores combining direct and indirect assessments.</CardDescription>
              </CardHeader>
              <CardContent>
                  <dl className="grid grid-cols-2 gap-x-6 gap-y-6 sm:grid-cols-3 lg:grid-cols-4">
                      <div className="flex flex-col p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                          <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Attainment</dt>
                          <dd className="mt-1 text-2xl font-semibold tracking-tight text-primary-600 dark:text-primary-400">{attainmentSummary.totalAttainment}%</dd>
                      </div>
                      <div className="flex flex-col p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                          <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Direct Attainment (CIE+SEE)</dt>
                          <dd className="mt-1 text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">{attainmentSummary.directAttainment}%</dd>
                      </div>
                      <div className="flex flex-col p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                          <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Indirect Attainment (Survey)</dt>
                          <dd className="mt-1 text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">{attainmentSummary.indirectAttainment}%</dd>
                      </div>
                      <div className="flex flex-col p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                          <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Students Reached Target</dt>
                          <dd className="mt-1 text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">{attainmentSummary.studentsReachedTarget} / {attainmentSummary.totalStudents}</dd>
                      </div>
                  </dl>
              </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardContent>
            <div className="text-center py-20 text-gray-500 dark:text-gray-400">
              <p>No courses assigned to you.</p>
              <p className="text-sm">Please select a course to view reports, or contact your admin.</p>
            </div>
          </CardContent>
        </Card>
      )}

    </div>
  );
};

export default AttainmentReportPage;