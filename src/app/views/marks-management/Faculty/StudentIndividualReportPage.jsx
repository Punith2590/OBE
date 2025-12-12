// src/app/views/marks-management/Faculty/StudentIndividualReportPage.jsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../shared/Card';
import api from '../../../services/api';
import { ArrowLeft, Download, Award, TrendingUp, AlertCircle } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const StudentIndividualReportPage = () => {
    const { courseId, studentId } = useParams();
    const navigate = useNavigate();
    const componentRef = useRef(null); // Initialize as null

    const [student, setStudent] = useState(null);
    const [course, setCourse] = useState(null);
    const [marks, setMarks] = useState([]);
    const [loading, setLoading] = useState(true);

    // --- FIX: Use contentRef for react-to-print ---
    const handlePrint = useReactToPrint({
        contentRef: componentRef,
        documentTitle: `Student_Report_${studentId}`,
    });

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [studentRes, courseRes, marksRes] = await Promise.all([
                    api.get(`/students?id=${studentId}`),
                    api.get(`/courses?id=${courseId}`),
                    api.get(`/marks?courseId=${courseId}&studentId=${studentId}`)
                ]);

                setStudent(studentRes.data[0]);
                setCourse(courseRes.data[0]);
                setMarks(marksRes.data);
            } catch (error) {
                console.error("Failed to load report data", error);
            } finally {
                setLoading(false);
            }
        };

        if (courseId && studentId) fetchData();
    }, [courseId, studentId]);

    const reportData = useMemo(() => {
        if (!course || !marks) return null;

        const assessmentData = [];
        let totalObtained = 0;
        let totalMax = 0;
        
        // --- FIX: Deduplicate Tools ---
        // Ensure we don't process "Internal Assessment 1" twice if it exists twice in config
        const seenTools = new Set();
        const uniqueTools = (course.assessmentTools || []).filter(tool => {
            const isDuplicate = seenTools.has(tool.name);
            seenTools.add(tool.name);
            return !isDuplicate;
        });

        // 1. Helper: Precise Summation
        const getPreciseScore = (scoreRecord, tool) => {
            if (!scoreRecord || !scoreRecord.scores) return 0;

            let validKeys = [];

            if (tool.type === 'Semester End Exam') {
                validKeys = ['External'];
            } else if (tool.type === 'Activity') {
                validKeys = ['Score'];
            } else {
                validKeys = Object.keys(tool.coDistribution || {});
            }

            return validKeys.reduce((sum, key) => {
                const val = parseInt(scoreRecord.scores[key]);
                return sum + (isNaN(val) ? 0 : val);
            }, 0);
        };

        // 2. Helper: Find Improvement Score
        const findImprovementScore = (targetName) => {
            const impTestRecord = marks.find(m => 
                (m.assessment === 'Improvement Test' || m.assessment.startsWith('Improvement')) && 
                m.improvementTarget === targetName
            );
            
            if (!impTestRecord) return null;

            // Find config for the TARGET tool to sum correctly
            const targetTool = uniqueTools.find(t => t.name === targetName);
            if (!targetTool) return 0;

            return getPreciseScore(impTestRecord, targetTool);
        };

        // 3. Main Loop - Filter out Improvement Tests from being rows
        const standardTools = uniqueTools.filter(t => t.type !== 'Improvement Test');

        standardTools.forEach(tool => {
            // Get Record
            const record = marks.find(m => m.assessment === tool.name);
            
            // Calculate Scores
            const originalScore = getPreciseScore(record, tool);
            const improvementScore = findImprovementScore(tool.name);
            
            // Logic: Final Score is strictly Original Score (Improvement is just for display/reference)
            const finalScore = originalScore; 

            assessmentData.push({
                name: tool.name,
                type: tool.type,
                obtained: finalScore, 
                original: originalScore,
                improvement: improvementScore,
                max: tool.maxMarks,
                percentage: tool.maxMarks > 0 ? (finalScore / tool.maxMarks) * 100 : 0
            });

            // Add to totals
            totalObtained += finalScore;
            totalMax += tool.maxMarks;
        });

        const overallPercentage = totalMax > 0 ? (totalObtained / totalMax) * 100 : 0;
        
        // Chart.js Data
        const barChartData = {
            labels: assessmentData.map(d => d.name),
            datasets: [
                {
                    label: 'Score Obtained',
                    data: assessmentData.map(d => d.obtained),
                    backgroundColor: 'rgba(59, 130, 246, 0.8)', // Primary Blue
                    borderRadius: 4,
                },
                {
                    label: 'Max Marks',
                    data: assessmentData.map(d => d.max),
                    backgroundColor: 'rgba(209, 213, 219, 0.5)', // Gray
                    borderRadius: 4,
                    hidden: true 
                }
            ],
        };

        const pieChartData = {
            labels: assessmentData.map(d => d.name),
            datasets: [
                {
                    data: assessmentData.map(d => d.obtained),
                    backgroundColor: [
                        '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'
                    ],
                    borderWidth: 0,
                },
            ],
        };

        return { assessmentData, totalObtained, totalMax, overallPercentage, barChartData, pieChartData };
    }, [course, marks]);

    if (loading) return <div className="p-12 text-center">Loading Report...</div>;
    if (!student || !course) return <div className="p-12 text-center">Data not found.</div>;

    return (
        <div className="p-6 space-y-6">
            {/* Header Actions */}
            <div className="flex justify-between items-center print:hidden">
                <button 
                    onClick={() => navigate(-1)} 
                    className="flex items-center text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back to List
                </button>
                <button 
                    onClick={handlePrint}
                    className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 shadow-sm transition-colors"
                >
                    <Download className="w-4 h-4" /> Export PDF / Print
                </button>
            </div>

            {/* Printable Content Area */}
            <div ref={componentRef} className="space-y-6 p-4 bg-white dark:bg-gray-900 print:p-8 print:bg-white" id="printable-report">
                
                {/* Print Header */}
                <div className="hidden print:block text-center mb-6 border-b pb-4">
                    <h1 className="text-2xl font-bold uppercase">Department of {course.departmentId || 'Engineering'}</h1>
                    <h2 className="text-xl">Individual Student Assessment Report</h2>
                </div>

                {/* Profile Card */}
                <Card className="border-t-4 border-t-primary-600 shadow-sm">
                    <CardContent className="p-6">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{student.name}</h1>
                                <p className="text-gray-500 font-mono text-lg">{student.usn}</p>
                                <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
                                    Course: <span className="font-bold">{course.code} - {course.name}</span>
                                </p>
                            </div>
                            <div className="mt-4 md:mt-0 text-right">
                                <div className="inline-flex flex-col items-end">
                                    <span className="text-sm text-gray-500 uppercase tracking-wider">Overall Performance</span>
                                    <span className={`text-3xl font-extrabold ${reportData.overallPercentage >= 60 ? 'text-green-600' : reportData.overallPercentage >= 40 ? 'text-yellow-600' : 'text-red-600'}`}>
                                        {reportData.overallPercentage.toFixed(2)}%
                                    </span>
                                    <span className="text-xs text-gray-400">
                                        {reportData.totalObtained} / {reportData.totalMax} Total Marks
                                    </span>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 print:hidden">
                    <Card>
                        <CardContent className="p-4 flex items-center gap-4">
                            <div className="p-3 bg-blue-100 text-blue-600 rounded-full dark:bg-blue-900/30">
                                <Award className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Result Status</p>
                                <p className="text-lg font-bold text-gray-900 dark:text-white">
                                    {reportData.overallPercentage >= 40 ? 'Pass' : 'Fail'}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4 flex items-center gap-4">
                            <div className="p-3 bg-purple-100 text-purple-600 rounded-full dark:bg-purple-900/30">
                                <TrendingUp className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Class</p>
                                <p className="text-lg font-bold text-gray-900 dark:text-white">
                                    {reportData.overallPercentage >= 75 ? 'Distinction' : reportData.overallPercentage >= 60 ? 'First Class' : 'Second Class'}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4 flex items-center gap-4">
                            <div className="p-3 bg-orange-100 text-orange-600 rounded-full dark:bg-orange-900/30">
                                <AlertCircle className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Progress</p>
                                <p className="text-lg font-bold text-gray-900 dark:text-white">
                                    {reportData.assessmentData.filter(d => d.obtained > 0).length} / {reportData.assessmentData.length} Assessments
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print:break-inside-avoid">
                    <Card>
                        <CardHeader>
                            <CardTitle>Performance by Assessment</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="h-64 flex justify-center">
                                <Bar 
                                    data={reportData.barChartData} 
                                    options={{
                                        responsive: true,
                                        maintainAspectRatio: false,
                                        scales: { y: { beginAtZero: true, max: Math.max(100, ...reportData.assessmentData.map(d=>d.max)) } }
                                    }} 
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Score Contribution</CardTitle>
                        </CardHeader>
                        <CardContent>
                             <div className="h-64 flex justify-center">
                                <Doughnut 
                                    data={reportData.pieChartData} 
                                    options={{
                                        responsive: true,
                                        maintainAspectRatio: false,
                                        plugins: { legend: { position: 'right' } }
                                    }}
                                />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Table */}
                <Card className="print:shadow-none print:border-none">
                    <CardHeader className="print:hidden">
                        <CardTitle>Detailed Marks Statement</CardTitle>
                    </CardHeader>
                    <CardContent className="print:p-0">
                        <div className="overflow-x-auto border rounded-lg dark:border-gray-700 print:border-gray-300">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
                                <thead className="bg-gray-50 dark:bg-gray-700/50 print:bg-gray-100">
                                    <tr>
                                        <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase border-r print:text-black">Assessment</th>
                                        <th className="px-4 py-3 text-center font-medium text-gray-500 uppercase border-r print:text-black">Max Marks</th>
                                        <th className="px-4 py-3 text-center font-medium text-gray-500 uppercase border-r print:text-black">Original</th>
                                        <th className="px-4 py-3 text-center font-medium text-gray-500 uppercase border-r print:text-black">Improvement</th>
                                        <th className="px-4 py-3 text-center font-medium text-gray-500 uppercase border-r print:text-black">Final Obtained</th>
                                        <th className="px-4 py-3 text-center font-medium text-gray-500 uppercase print:text-black">Result</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                    {reportData.assessmentData.map((row, i) => (
                                        <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 print:hover:bg-transparent">
                                            <td className="px-4 py-3 font-medium text-gray-900 dark:text-white border-r">{row.name}</td>
                                            <td className="px-4 py-3 text-center text-gray-500 border-r">{row.max}</td>
                                            <td className="px-4 py-3 text-center text-gray-800 border-r">{row.original}</td>
                                            <td className="px-4 py-3 text-center text-gray-500 border-r">
                                                {row.improvement !== null ? (
                                                    <span className="text-purple-600 font-medium">{row.improvement}</span>
                                                ) : '-'}
                                            </td>
                                            <td className="px-4 py-3 text-center font-bold text-gray-800 dark:text-white border-r">
                                                {row.obtained} 
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                                                    row.percentage >= 40 ? 'bg-green-100 text-green-800 print:text-green-800' : 'bg-red-100 text-red-800 print:text-red-800'
                                                }`}>
                                                    {row.percentage >= 40 ? 'PASS' : 'FAIL'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                    <tr className="bg-gray-100 dark:bg-gray-800 font-bold border-t-2 border-gray-300">
                                        <td className="px-4 py-3 border-r">TOTAL</td>
                                        <td className="px-4 py-3 text-center border-r">{reportData.totalMax}</td>
                                        <td className="px-4 py-3 text-center border-r">-</td>
                                        <td className="px-4 py-3 text-center border-r">-</td>
                                        <td className="px-4 py-3 text-center text-primary-700">{reportData.totalObtained}</td>
                                        <td className="px-4 py-3 text-center">
                                            {reportData.overallPercentage.toFixed(2)}%
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>

                <div className="hidden print:block mt-12 pt-8 border-t border-gray-300 text-center text-xs text-gray-500">
                    <div className="flex justify-between px-8 mb-8">
                        <div><p>____________________</p><p>Faculty Signature</p></div>
                        <div><p>____________________</p><p>HOD Signature</p></div>
                        <div><p>____________________</p><p>Principal Signature</p></div>
                    </div>
                    <p>Generated by OBE Management System on {new Date().toLocaleDateString()}</p>
                </div>
            </div>
        </div>
    );
};

export default StudentIndividualReportPage;