import React, { Component } from 'react';
import { useState, useEffect, useRef } from 'react';
import { graphviz} from 'd3-graphviz';
import * as FaIcons from 'react-icons/fa';
import * as d3 from 'd3';
import Select from 'react-select'

import './GraphViz.css'
import 'bootstrap/dist/css/bootstrap.css'

import { ProgressBar, Offcanvas, Modal, Button, Table } from 'react-bootstrap';

class MyRequest {
    constructor(args) {
        this.run = args.selectedRun;
        this.model = args.selectedModel;
        this.pass = args.selectedPass;
        this.graph = args.selectedGraph;
        this.gtype = args.selectedGraphType;
    }

    isCompleted() {
        return this.run && this.model && this.pass && this.graph && this.gtype;
    }

    requestGraph() {
        // don't need to skip, getting empty graph.
        return `http://localhost:5000/graph?selectedRun=${this.run}&selectedModel=${this.model}&selectedPass=${this.pass}&selectedGraph=${this.graph}&graphType=${this.gtype}`
    }

    requestNodes() {
        if (!this.isCompleted()) return;
        return `http://localhost:5000/nodes?selectedRun=${this.run}&selectedModel=${this.model}&selectedPass=${this.pass}&selectedGraph=${this.graph}&graphType=${this.gtype}`
    }

    requestAttrs(nodeName) {
        if (!this.isCompleted()) return;
        return `http://localhost:5000/attrs?selectedRun=${this.run}&selectedModel=${this.model}&selectedPass=${this.pass}&selectedGraph=${this.graph}&graphType=${this.gtype}&nodeName=${nodeName}`
    }

    equal(other) {
        return this.run == other.run && this.model == other.model && this.pass == other.pass && this.graph == other.graph && this.gtype == other.gtype;
    }
}

class MyGraphviz extends React.Component {
    state = {
        activeTransition: null,
        graph: null,
        r: null,

        highlightedNode: null,
    }

    getClassId = () => {
        return this.props.className + this.id;
    }

    render = () => {
        return (<div className={this.getClassId() + ' Graph'} id={this.getClassId()}></div>);
    }

    componentDidMount = () => {
        console.log("Graph#Mount");
        this.renderGraph();
    }

    componentDidUpdate = () => {
        console.log("Graph#Update");
        this.renderGraph();
    }

    onNodeClick = (d) => {
        fetch(this.state.r.requestAttrs(d.node().key))
        .then(responce => responce.json())
        .then(data => {
            this.props.showNodeAttributes(data.attrs);
        });
    }

    collectNodes = () => {
        fetch(this.state.r.requestNodes())
        .then(responce => responce.json())
        .then(data => {
            this.props.setNodeNames(data.nodes);
        });
    }

    renderGraph = () => {
        var req = new MyRequest(this.props);
        if (!req.isCompleted() || this.props.isDragging == 1) {
            if (req.gtype) {
                // missing graph case
            } else {
                return (<div className={this.getClassId() + ' Graph'} id={this.id}></div>);
            }
        }

        this.highlightNode();

        if (this.state.r && this.state.r.equal(req)) {
            return;
        }

        this.setState({r: req});

        console.log("Graph#render");
        console.log(this.props.isDragging);

        const px2pt = 3 / 4;
        const scale = 0.8;

        function attributer(datum, index, nodes) {
            var selection = d3.select(this);
            if (datum.tag == "svg") {
                datum.attributes = {
                    ...datum.attributes,
                    width: '100%',
                    height: '100%',
                };
                // svg is constructed by hpcc-js/wasm, which uses pt instead of px, so need to convert
                const px2pt = 3 / 4;
        
                // get graph dimensions in px. These can be grabbed from the viewBox of the svg
                // that hpcc-js/wasm generates
                const graphWidth = datum.attributes.viewBox.split(' ')[2] / px2pt;
                const graphHeight = datum.attributes.viewBox.split(' ')[3] / px2pt;
        
                // new viewBox width and height
                const w = graphWidth / scale;
                const h = graphHeight / scale;
        
                // new viewBox origin to keep the graph centered
                const x = -(w - graphWidth) / 2;
                const y = -(h - graphHeight) / 2;
        
                const viewBox = `${x * px2pt} ${y * px2pt} ${w * px2pt} ${h * px2pt}`;
                selection.attr('viewBox', viewBox);
                datum.attributes.viewBox = viewBox;
            }
        }

        fetch(req.requestGraph())
        .then(responce => responce.json())
        .then(data => {
            var g = graphviz(`#${this.getClassId()}`)
                    // .on("initEnd", () => { this.props.progressBarChange(10) })
                    // .on("start", () => { this.props.progressBarChange(20) })
                    // .on("layoutStart", () => { this.props.progressBarChange(30) })
                    // .on("layoutEnd", () => { this.props.progressBarChange(40) })
                    // .on("dataExtractEnd", () => { this.props.progressBarChange(50)})
                    // .on("dataProcessPass1End", () => { this.props.progressBarChange(60)})
                    // .on("dataProcessPass2End", () => { this.props.progressBarChange(70)})
                    // .on("dataProcessEnd", () => { this.props.progressBarChange(80)})
                    // .on("renderStart", () => { this.props.progressBarChange(90)})
                    // .on("renderEnd", () => { this.props.progressBarChange(95)})
                    // .on("end", () => { this.props.progressBarChange(100) })
                    .options(Object.assign(Object.assign({}, MyGraphviz.defaultOptions), this.props.options || {}))
                    .renderDot(data.graph);
            if (this.state.graph == null) {
                this.setState({graph : g});
            }

            // // Set default scale
            var zoom = g.zoomBehavior();
            var selection = g.zoomSelection();
            zoom.scaleTo(selection, MyGraphviz.defaultOptions.scale);
            // zoom.translateTo(selection, 300, 400, [0, 0]);

            const graph_name = "." + this.getClassId();

            var tmp = d3.select(graph_name).select(".graph").attr("transform");
            var translate = tmp.substring(tmp.indexOf("(")+1, tmp.indexOf(")")).split(",");
            console.log(translate);

            var box = d3.select(graph_name).select(".graph").node().getBBox();
            console.log("Box: ", box)

            // d3.select(graph_name).select(".graph").append('rect')
            //                     .attr('x', box.x)
            //                     .attr('y', box.y)
            //                     .attr('width', box.width)
            //                     .attr('height', box.height)
            //                     .attr('stroke', 'black')
            //                     .attr('fill-opacity', 0)

            var gx = box.x + box.width / 2;
            var gy = box.y + box.height / 2;

            // Center
            // d3.select(graph_name).select(".graph").append('circle')
            //                     .attr('cx', gx)
            //                     .attr('cy', gy)
            //                     .attr('r', 5)
            //                     .attr('stroke', 'black')
            //                     .attr('fill', '#69a3b2');


            d3.selectAll(".node").each(function(d, i) {
                var b = d3.select(this).node().getBBox();
                // d3.select(this).append('rect')
                //                 .attr('x', b.x)
                //                 .attr('y', b.y)
                //                 .attr('width', b.width)
                //                 .attr('height', b.height)
                //                 .attr('stroke', 'black')
                //                 .attr('fill-opacity', 0)
            });
            

            var svg = d3.select(graph_name).select("svg");

            const vb = svg.attr('viewBox').split(' ').map(element => {
                return Number(element);
            });;
            console.log("ViewBox", vb);

            var sx = vb[2] / 2;
            var sy = vb[3] / 2;

            // Center
            // svg.append('circle')
            //     .attr('cx', sx)
            //     .attr('cy', sy)
            //     .attr('r', 5)
            //     .attr('stroke', 'black')
            //     .attr('fill', '#ffa3b2');

            var transform = d3.zoomTransform(selection.node());
            console.log(transform)

            console.log(gx, gy);
            console.log(sx + transform.x  *transform.k, sy + transform.y * transform.k);
            console.log(gx + sx - (transform.x + gx), gy + sy - (transform.y+ gy))

            // console.log(transform);
            // zoom.translateBy(selection, sx - (transform.x + gx), sy - (transform.y+ gy));
            // svg.append('rect')
            //                     .attr('x', 0)
            //                     .attr('y', 0 )
            //                     .attr('width', vb[2] / 2)
            //                     .attr('height', vb[3] / 2)
            //                     .attr('stroke', 'black')
            //                     .attr('fill-opacity', 0)



            // const graphWidth = attr.split(' ')[2] / 2;
            // const graphHeight = attr.split(' ')[3] / 2;
    
            // // new viewBox width and height
            const w = parseFloat(translate[0]) + box.x;
            const h = parseFloat(translate[1]) + box.y;

            console.log(w, h);
    
            // // new viewBox origin to keep the graph centered
            // const x = (-(w - graphWidth) / 2) * px2pt;
            // const y = (-(h - graphHeight) / 2) * px2pt;

            // console.log(graphWidth, graphHeight);

            // zoom.translateBy(selection, 0 - w, 0 - h);
            // zoom.translateTo(selection, w, h, [300, 600]);

            const t = d3.transition()
                        .duration(750)
                        .ease(d3.easeLinear);

            g.transition(t);

            d3.select(graph_name).selectAll(".node").on('click', (d) => {
                var node = d3.select(d);
                this.onNodeClick(node);
            });
            
            this.collectNodes();

            // d3.selectAll(".node").each(function(d, i) {
            //     console.log(d3.select(this).on('onclick', this.onNodeClick));
            // });
        });
        
        // console.log(graphviz(`#${this.id}`).active());
        // var g = d3.graphviz(`#${this.id}`);
        // this.setState({activeTransition: g.active(`#${this.id}`)});
        // console.log(g.active(`#${this.id}`));
        // d3.selectAll('.graph').attr('fill', 'red');
    }

    constructor() {
        super()
        this.id = `graphviz${MyGraphviz.count}`;
        MyGraphviz.count += 1;
    }

    highlightNode = () => {
        if (!this.props.highlightedNode) {
            return;
        }

        const graph_name = "." + this.getClassId();
        d3.select(graph_name).selectAll(".node").each(function(d, i) {
            var node = d3.select(this);
            var title = node.select("title").node();

            console.log(title.id);
            var b = node.node().getBBox();

//            d3.select(this).append('rect')
//                .attr('x', b.x)
//                .attr('y', b.y)
//                .attr('width', b.width)
//                .attr('height', b.height)
//                .attr('stroke', 'red')
//                .attr('fill-opacity', 0)
        })
    }

    graphChange = (name, scale) => {
        // var zoom = d3.zoom();
        // d3.select('g').transition()
        //               .duration(750)
        //               .attr("transform", "translate(0,0) scale(1.5)");
        // zoom.scale(1.5); 
        // zoom.translate([100, 100]);

        // const t = d3.select('g').transition()
        //             .duration(750)
        //             .attr("transform", "translate(0,0) scale(1.5)");

        var a = parseInt(d3.select(`#${name}`).select("text").attr("x")) - 300;
        var b = parseInt(d3.select(`#${name}`).select("text").attr("y")) - 100;

        console.log(a, b);
        console.log(typeof(a));

        
        var zoom = this.state.graph.zoomBehavior();
        var selection = this.state.graph.zoomSelection();

        zoom.scaleTo(selection, scale);
        zoom.translateTo(selection, a, b, [0, 0]);

        // zoom.scaleTo(selection, 0.5);
        // this.state.graph.render();

        
        // this.state.graph.scale(0.5);
        // this.state.graph.render();

        // g.transition("translate (0, 0) scale(1)");
        // g.render();
        // d3.selectAll(".graph").attr('transform', 'translate(100, 100) scale(1)');
    }
}

MyGraphviz.count = 0;
MyGraphviz.defaultOptions = {
    fit: true,
    zoom: true,
    scale: 0.8,
    zoomScaleExtent: [0.01, 20],
    width: "100%",
    height: "calc(100% - 30px)",
    tweenShapes: false,
    tweenPaths: false,
};

class Viz extends Component {
    state = {
        cursor_type : 'pointer',
        isDragging : 0,
        progressBarNow : 0,
        
        showMenu: false,
        showSearchMenu: false,

        highlightedNode: null,

        menuWidth: 0,
        menuNodeAttrs: {},

        searchMenuNodes: [],
    }

    showMenu = args => {
        this.setState({menuWidth : 35, showMenu : true, showSearchMenu : false});
    }

    showSearchMenu = () => {
        this.setState({menuWidth : 35, showMenu : false, showSearchMenu : true});
    }

    hideMenu = args => {
        this.setState({menuWidth : 0, showMenu : false, showSearchMenu : false});
    }

    setNodeNames = (nodes) => {
        this.setState({searchMenuNodes : nodes});
    }

    cursorResized = args => {
        this.setState({cursor_type: 'col-resize'});
    }

    cursorOrig = e => {
        this.setState({cursor_type: 'pointer'});
    }

    stopDrag = e => {
        console.log("stop_drag");
        document.removeEventListener('mousemove', this.props.changeNavWidth);
        this.setState({ isDragging: 0});
    }

    startDrag = e => {
        console.log("start_drag");
        document.addEventListener('mousemove', this.props.changeNavWidth);
        this.setState({ isDragging: 1});

        document.addEventListener("mouseup", (args) => {
            this.stopDrag(e);
        });
    }

    progressBarChange = (args) => {
        this.setState({ progressBarNow : args.now });
    }

    selectNode = (selectedOption) => {
        var r = new MyRequest(this.props);
        if (r.isCompleted()) {
            fetch(r.requestAttrs(selectedOption.value))
            .then(responce => responce.json())
            .then(data => {
                this.showNodeAttributes(data.attrs);
                this.setState({highlightedNode: selectedOption.value});
            });
        }
    }

    renderMenu = () => {
        if (!this.state.showMenu && !this.state.showSearchMenu) {
            return (
                <div className='GraphVizMenu' style={{"width": `${this.state.menuWidth}px`}}/>
            );
        }

        if (this.state.showMenu) {
            return (
                <div className='GraphVizMenu' style={{"width": `${this.state.menuWidth}%`}}>
                    <FaIcons.FaTimes className='MenuExitIcon' onClick={this.hideMenu}/>
                    <Table className="MenuAttributes overflow-scroll" striped bordered hover>
                        <thead>
                            <tr>
                                <th>Attr</th>
                                <th>Value</th>
                            </tr>
                        </thead>
                        <tbody>
                            {Object.keys(this.state.menuNodeAttrs).map((attr_name, index) =>
                                <tr key={index}>
                                    <td>{attr_name}</td>
                                    <td style={{"word-break": "break-all"}}>{this.state.menuNodeAttrs[attr_name]}</td>
                                </tr>
                            )}
                        </tbody>
                    </Table>
                </div>
            );
        }

        if (this.state.showSearchMenu) {
            return (
                <div className='GraphVizSearchMenu' style={{"width": `${this.state.menuWidth}%`}}>
                    <FaIcons.FaTimes className='MenuExitIcon' onClick={this.hideMenu}/>
                    <Select className='Selector' onChange={this.selectNode} options={this.state.searchMenuNodes}/>
                </div>
            );
        }
    }

    showNodeAttributes = args => {
        this.hideMenu();
        this.showMenu();
        this.setState({menuNodeAttrs : args});
    }

    getVizTitle = () => {
        var r = new MyRequest(this.props);
        if (!r.isCompleted() && r.gtype) {
            return "Graph Is Missing";
        }

        var t = "";
        if (this.props.selectedRun) {
            t += this.props.selectedRun;
        }
        if (this.props.selectedModel) {
            t += "/" + this.props.selectedModel;
        }
        if (this.props.selectedPass) {
            t += "/" + this.props.selectedPass;
        }
        if (this.props.selectedGraph) {
            t += "/" + this.props.selectedGraph;
        }
        if (this.props.selectedGraphType) {
            t += "/" + this.props.selectedGraphType;
        }
        return t;
    }

    render() {
        return (
            <div className='Viz rounded'>
                {/* <ProgressBar animated now={this.state.progressBarNow}/> */}
                <div className='VizMain'>
                    <FaIcons.FaGripLinesVertical className="ResizeViz"
                                                draggable="false"
                                                onMouseEnter={this.cursorResized}
                                                onMouseLeave={this.cursorOrig}
                                                onMouseDown={this.startDrag}
                                                style={{cursor: this.state.cursor_type}}/>
                    <div className='GraphVizHandler'>
                        <div className='GraphVizHeader'>
                            <div className='GraphVizTitle'>
                                {this.getVizTitle()}
                            </div>
                            <FaIcons.FaSearch className='GraphVizMenuIcon' onClick={this.showSearchMenu}/>
                        </div>
                        <div className='GraphVizView'>
                            <MyGraphviz {...this.props}
                                    className='Graph'
                                    updateNodes={this.updateNodes}
                                    progressBarChange={this.progressBarChange}
                                    isDragging={this.state.isDragging}
                                    showNodeAttributes={this.showNodeAttributes}
                                    highlightedNode={this.state.highlightedNode}
                                    setNodeNames={this.setNodeNames}/>
                            <this.renderMenu />
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}
 
export default Viz;