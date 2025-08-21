import { useState } from 'react'
import './App.css'
import NutritionDashboard from './pages/NutritionDashboard'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';

function App() {
  return (
    <Router>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={
            <NutritionDashboard />
        } />
      </Routes> 
    </Router>
  );
}

export default App
