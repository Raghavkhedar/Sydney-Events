// import { useState } from 'react'

// function App() {
  
//   return (
  //     <>
  
  //     </>
  //   )
  // }
  
  // export default App
  
  
import './App.css'
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Events from "./pages/Events";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Events />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
