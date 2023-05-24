import React, { Component, useState, useEffect } from 'react';
import Select from 'react-select'

import MenuItems from '../components/pass_viz/MenuItems';
import MenuHeader from '../components/pass_viz/MenuHeader';
import Viz from '../components/pass_viz/GraphViz';

import { Accordion, DropdownButton, Dropdown, ListGroup, Modal, ModalHeader, Button } from 'react-bootstrap';

import * as FaIcons from 'react-icons/fa';

import './PassViz.css'


function Example() {
    const [show, setShow] = useState(false);
  
    const handleClose = () => setShow(false);
    const handleShow = () => setShow(true);
  
    return (
      <>
        <Button variant="primary" onClick={handleShow}>
          Launch demo modal
        </Button>
  
        <Modal show={show} onHide={handleClose}>
          <Modal.Header closeButton>
            <Modal.Title>Modal heading</Modal.Title>
          </Modal.Header>
          <Modal.Body>Woohoo, you're reading this text in a modal!</Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={handleClose}>
              Close
            </Button>
            <Button variant="primary" onClick={handleClose}>
              Save Changes
            </Button>
          </Modal.Footer>
        </Modal>
      </>
    );
  }

class PassViz extends Component {
    state = {
        availableRuns: {},
        runToRemove: null,
        show: false,
    };

    handleCloseSuccess = () => {
        this.setState({show : false});
        this.removeRun();
    };

    handleClose = () => {
        this.setState({show : false});
    };

    handleShow = args => {
        this.setState({show : true, runToRemove : args.name});
    };

    updateAvailableRuns = () => {
        fetch('http://localhost:5000/availableRuns')
        .then(responce => responce.json())
        .then(data=> {
            this.setState({availableRuns: data.runs});
        });
    }

    componentDidMount() {
        this.updateAvailableRuns();
    }

    removeRun = () => {
        console.log(this.state.runToRemove);
        fetch(`http://localhost:5000/remove?selectedRun=${this.state.runToRemove}`)
        this.updateAvailableRuns();
    }

    render() {
        return (
            <div className="MenuItems">
                <ul className='list-group'>
                    {Object.values(this.state.availableRuns).map(item =>
                        <li key={item.label} className='list-group-item pass-item'>
                            {item.label}
                            {/* <FaIcons.FaTrash onClick={() => this.removeRun({name: item.label})}/> */}
                            <FaIcons.FaTrash onClick={() => this.handleShow({name: item.label})}/>
                        </li>
                    )}
                </ul>

                <Modal show={this.state.show} onHide={this.handleClose}>
                    <Modal.Header closeButton>
                        <Modal.Title>{`Removing: ${this.state.runToRemove}`}</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>Woohoo, are you shure?</Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={this.handleClose}>
                        No
                        </Button>
                        <Button variant="primary" onClick={this.handleCloseSuccess}>
                        Yes, please
                        </Button>
                    </Modal.Footer>
                </Modal>
            </div>
        );
    }
}
 
export default PassViz;