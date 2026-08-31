import React from 'react';
import { User } from '../types';
import { User as UserIcon, Shield, Sliders } from 'lucide-react';

interface SettingsViewProps {
  currentUser: User | null;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ currentUser }) => {
  return (
    <div className="view-container">
      <div className="view-header">
        <div className="view-title">
          <h2>Application Settings</h2>
          <p className="text-muted">Manage your personal account and preferences.</p>
        </div>
      </div>
      
      <div className="view-content" style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
        
        {/* Account Section */}
        <div className="card" style={{ marginBottom: '24px' }}>
          <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
            <UserIcon size={18} className="text-primary" />
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>Account</h3>
          </div>
          <div className="card-body" style={{ paddingTop: '16px' }}>
            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '0.85rem', color: '#475569' }}>Full Name</label>
              <input type="text" className="form-input" style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', backgroundColor: '#f8fafc' }} value={currentUser?.full_name || ''} readOnly />
            </div>
            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '0.85rem', color: '#475569' }}>Email Address</label>
              <input type="email" className="form-input" style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', backgroundColor: '#f8fafc' }} value={currentUser?.email || ''} readOnly />
            </div>
            <div className="form-group">
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '0.85rem', color: '#475569' }}>Organization</label>
              <input type="text" className="form-input" style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', backgroundColor: '#f8fafc' }} value={currentUser?.organization?.name || 'No Organization'} readOnly />
            </div>
            <p style={{ marginTop: '12px', fontSize: '0.75rem', color: '#64748b' }}>* Account details are synced with your organization directory.</p>
          </div>
        </div>

        {/* Application Preferences Section */}
        <div className="card" style={{ marginBottom: '24px' }}>
          <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
            <Sliders size={18} className="text-primary" />
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>Application Preferences (UI Only)</h3>
          </div>
          <div className="card-body" style={{ paddingTop: '16px' }}>
            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '0.85rem', color: '#475569' }}>Default Currency</label>
              <select className="form-input" style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', backgroundColor: '#f8fafc' }} disabled>
                <option>AUD ($)</option>
                <option>USD ($)</option>
                <option>EUR (€)</option>
                <option>GBP (£)</option>
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '0.85rem', color: '#475569' }}>Date Format</label>
              <select className="form-input" style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', backgroundColor: '#f8fafc' }} disabled>
                <option>DD/MM/YYYY</option>
                <option>MM/DD/YYYY</option>
                <option>YYYY-MM-DD</option>
              </select>
            </div>
            <div className="form-group">
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '0.85rem', color: '#475569' }}>Default View</label>
              <select className="form-input" style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', backgroundColor: '#f8fafc' }} disabled>
                <option>Projects Portfolio</option>
                <option>Scenario Manager</option>
                <option>Portfolio Analytics</option>
              </select>
            </div>
          </div>
        </div>

        {/* Security Section */}
        <div className="card">
          <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
            <Shield size={18} className="text-primary" />
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>Security</h3>
          </div>
          <div className="card-body" style={{ paddingTop: '16px' }}>
            <p style={{ marginBottom: '16px', fontSize: '0.85rem', color: '#475569' }}>
              Ensure your account is using a strong, unique password.
            </p>
            <button className="btn btn-outline" style={{ padding: '8px 16px', border: '1px solid #cbd5e1', borderRadius: '6px', backgroundColor: '#fff', cursor: 'pointer', fontWeight: 500, color: '#334155' }} onClick={() => alert('Change password functionality not implemented in backend yet.')}>
              Change Password
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
