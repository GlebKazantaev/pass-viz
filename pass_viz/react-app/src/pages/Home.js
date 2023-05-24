import React from 'react';
import { Link } from "react-router-dom";

import './Home.css'

function Home() {
  return (
    <div className='Home'>
      <div className='HomeRow1'/>
      <div className='HomeRow2'>
          <div></div>
          <Link to="/data" className='ButtonData column-item rounded'>
              <span className="PassVizLink" style={{"display": "block"}}>
                Show Me The Data
              </span>
          </Link>
          <div></div>
      </div>
      <div className='HomeRow3'>
        <div></div>
          <Link to="/pass_viz" className='Button1 column-item rounded'>
              <span className="PassVizLink" style={{"display": "block"}}>
                Visualize Pass By Model
              </span>
          </Link>
          <Link to="/compare_pass" className='Button2 column-item rounded'>
              <span className="PassVizLink" style={{"display": "block"}}>
                Compare Passes Execution
              </span>
          </Link>
          <div to="/" className='Button3 column-item rounded'>
              <span className="PassVizLink" style={{"display": "block"}}>
                Model Visualizer
              </span>
          </div>
        <div></div>
      </div>
      <div className='HomeRow4'>
        <div></div>
          <div to="/" className='Button4 column-item rounded'>
              <span className="PassVizLink" style={{"display": "block"}}>
                Search Model By Pass
              </span>
          </div>
          <div to="/" className='Button5 column-item rounded'>
              <span className="PassVizLink" style={{"display": "block"}}>
                Serach Pass By Pattern
              </span>
          </div>
          <div to="/" className='Button6 column-item rounded'>
              <span className="PassVizLink" style={{"display": "block"}}>
                Search Pattern In Model
              </span>
          </div>
        <div></div>
      </div>
    </div>
  );
}

export default Home;