import React, {useState} from 'react';
import { BrowserRouter as Router, Route, Routes, Link } from "react-router-dom";

import './App.css';
import 'bootstrap/dist/css/bootstrap.css';

import PassViz from './pages/PassViz';
import Home from './pages/Home';
import Data from './pages/Data';
import ComparePass from './pages/ComparePass';


function App() {
  const [value, setValue] = useState(0);

  return (
    <div className='App'>
      <Router>
        <Link to="/" className='Header'>
          {/* Pass-Viz */}
        </Link>
        <div className="progress" style={{height: '5px'}}>
          <div className="progress-bar" role="progressbar" style={{width: `${value}%`}} aria-valuenow={value} aria-valuemin="0" aria-valuemax="100" />
        </div>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/data" element={<Data />} />
          <Route path="/pass_viz" element={<PassViz progressBar={setValue} />} />
          <Route path="/compare_pass" element={<ComparePass progressBar={setValue} />} />
        </Routes>
        <div className='Footer'>Gleb Kazantaev</div>
      </Router>
    </div>
  );
}

export default App;
