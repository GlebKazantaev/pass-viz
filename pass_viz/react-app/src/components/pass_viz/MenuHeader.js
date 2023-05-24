import React, { Component } from 'react';

import * as FaIcons from 'react-icons/fa';
import './MenuHeader.css'

const BackToPasses = args => {
    if (args.isActive) {
        return (
            <FaIcons.FaArrowLeft className='BackToPasses' onClick={args.onClick} />
        );
    } else {
        return (<></>);
    }
}

class MenuHeader extends Component {
    state = {  } 
    render() {
        if (this.props.is_active) {
            return (
                <div className='MenuHeader rounded'>
                    <div className='MenuHeaderBack'>
                        <BackToPasses onClick={this.props.backMenu} isActive={this.props.back_is_active} />
                    </div>
                    <div></div>
                    <div className='MenuHeaderSort'>
                        <FaIcons.FaSortNumericUp/>
                    </div>
                </div>
            );
        } else {
            return (<></>);
        }
    }
}
 
export default MenuHeader;