// src/app/routes.jsx
import { lazy } from "react";
import { Navigate } from "react-router-dom";
import ParcLayout from "./components/ParcLayout/ParcLayout";
import LoginPage from "./views/sessions/LoginPage";

// --- DASHBOARD IMPORTS ---
const DefaultDashboard = lazy(() => import("./views/dashboard/DefaultDashboard"));

// --- FACULTY IMPORTS ---
const FacultyDashboard = lazy(() => import("./views/marks-management/Faculty/FacultyDashboard")); 
const ArticulationMatrixPage = lazy(() => import("./views/marks-management/Faculty/ArticulationMatrixPage"));
const MarksEntryPage = lazy(() => import("./views/marks-management/Faculty/MarksEntryPage"));
const IndirectCoPage = lazy(() => import("./views/marks-management/Faculty/IndirectCoAttainmentPage"));
const CoPoAttainmentPage = lazy(() => import("./views/marks-management/Faculty/CoPoAttainmentPage"));
const AttainmentReportPage = lazy(() => import("./views/marks-management/Faculty/AttainmentReportPage"));
// New Import
const StudentReportsPage = lazy(() => import("./views/marks-management/Faculty/StudentReportsPage"));
const FacultyConfigurationPage = lazy(() => import("./views/marks-management/Faculty/FacultyConfigurationPage"));

// --- ADMIN IMPORTS ---
const AdminDashboard = lazy(() => import("./views/marks-management/Admin/AdminDashboard"));
const FacultyManagement = lazy(() => import("./views/marks-management/Admin/FacultyManagement")); 
const CourseManagement = lazy(() => import("./views/marks-management/Admin/CourseManagement"));
const CourseAssignment = lazy(() => import("./views/marks-management/Admin/CourseAssignment"));
const OutcomesManagement = lazy(() => import("./views/marks-management/Admin/OutcomesManagement"));
const ConsolidatedMatrixPage = lazy(() => import("./views/marks-management/Admin/ConsolidatedMatrixPage"));
const ProgramLevelMatrixPage = lazy(() => import("./views/marks-management/Admin/ProgramLevelMatrixPage"));
const EvaluationResultPage = lazy(() => import("./views/marks-management/Admin/EvaluationResultPage"));
const IndirectAttainmentAdminPage = lazy(() => import("./views/marks-management/Admin/IndirectAttainmentPage"));
const ImprovementActionsPage = lazy(() => import("./views/marks-management/Admin/ImprovementActionsPage"));
const AdminConfigurationpage = lazy(() => import("./views/marks-management/Admin/AdminConfigurationpage"));

// --- SUPER ADMIN IMPORTS ---
const SuperAdminDashboard = lazy(() => import("./views/marks-management/SuperAdmin/SuperAdminDashboard"));
const DepartmentAttainmentPage = lazy(() => import("./views/marks-management/SuperAdmin/DepartmentAttainmentPage"));
const DepartmentManagement = lazy(() => import("./views/marks-management/SuperAdmin/DepartmentManagement"));
const AdminManagement = lazy(() => import("./views/marks-management/SuperAdmin/AdminManagement"));

const routes = [
  { path: "/", element: <Navigate to="/session/signin" /> },
  { path: "/session/signin", element: <LoginPage /> },
  
  {
    element: <ParcLayout />, 
    children: [
      { path: "/dashboard/default", element: <DefaultDashboard /> },

      // --- FACULTY ROUTES ---
      { path: "/faculty/dashboard", element: <FacultyDashboard /> },
      { path: "/faculty/articulation", element: <ArticulationMatrixPage /> },
      { path: "/faculty/marks", element: <MarksEntryPage /> },
      { path: "/faculty/indirect-co", element: <IndirectCoPage /> },
      { path: "/faculty/copo-attainment", element: <CoPoAttainmentPage /> },
      // Updated Path
      { path: "/faculty/course-reports", element: <AttainmentReportPage /> },
      // New Route
      { path: "/faculty/student-reports", element: <StudentReportsPage /> },
      { path: "/faculty/configuration", element: <FacultyConfigurationPage /> },

      // --- ADMIN ROUTES ---
      { path: "/admin/dashboard", element: <AdminDashboard /> },
      { path: "/admin/faculty", element: <FacultyManagement /> },
      { path: "/admin/manage-courses", element: <CourseManagement /> },
      { path: "/admin/assign-courses", element: <CourseAssignment /> },
      { path: "/admin/outcomes", element: <OutcomesManagement /> },
      { path: "/admin/consolidation", element: <ConsolidatedMatrixPage /> },
      { path: "/admin/program-matrix", element: <ProgramLevelMatrixPage /> },
      { path: "/admin/evaluation-result", element: <EvaluationResultPage /> },
      { path: "/admin/indirect-attainment", element: <IndirectAttainmentAdminPage /> },
      { path: "/admin/improvement-plans", element: <ImprovementActionsPage /> },
      { path: "/admin/configuration", element: <AdminConfigurationpage /> },

      // --- SUPER ADMIN ROUTES ---
      { path: "/superadmin/dashboard", element: <SuperAdminDashboard /> },
      { path: "/superadmin/departments", element: <DepartmentAttainmentPage /> },
      { path: "/superadmin/DepartmentManagement", element: <DepartmentManagement /> },
      { path: "/superadmin/AdminManagement", element: <AdminManagement /> }
    ]
  },
  
  { path: "*", element: <Navigate to="/session/signin" /> }
];

export default routes;