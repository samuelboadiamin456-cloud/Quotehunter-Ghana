import React from 'react';
import heroImage from '../../assets/images/accra_construction_site_1792271318170.jpg';

/**
 * Site-wide background: the Accra construction photo, slowly drifting, under a light wash
 * so dark text and white cards stay easy to read on every page.
 */
export const AppBackdrop: React.FC = () => (
  <div aria-hidden="true" className="qh-backdrop">
    <img src={heroImage} alt="" className="qh-backdrop-img" referrerPolicy="no-referrer" />
    <div className="qh-backdrop-wash" />
  </div>
);
