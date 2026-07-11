import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import MainLayout from '../layouts/MainLayout';

export default function Vault() {
  const navigate = useNavigate();
  
  // Auth State
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [isLogin, setIsLogin] = useState(true);
  
  // Login Form
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // Vault State
  const [machines, setMachines] = useState([]);
  const [currentMachineId, setCurrentMachineId] = useState('');
  const [activeTab, setActiveTab] = useState('documents');
  const [panelData, setPanelData] = useState({ documents: [], parts: [], consumables: [] });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSession(session);
        fetchUserData(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchUserData(session.user.id);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (user && user.company_id) {
      fetchMachines();
    }
  }, [user]);

  useEffect(() => {
    if (currentMachineId) {
      fetchPanelData();
    }
  }, [currentMachineId, activeTab]);

  async function fetchUserData(userId) {
    const { data, error } = await supabase
      .from('users')
      .select('*, companies(name, status)')
      .eq('id', userId)
      .single();
    if (data) setUser(data);
  }

  async function fetchMachines() {
    const { data } = await supabase.from('machines').select('*').order('created_at', { ascending: false });
    if (data && data.length > 0) {
      setMachines(data);
      setCurrentMachineId(data[0].id);
    }
  }

  async function fetchPanelData() {
    setIsLoading(true);
    if (activeTab === 'documents') {
      const { data } = await supabase.from('documents').select('*').eq('machine_id', currentMachineId);
      setPanelData(prev => ({ ...prev, documents: data || [] }));
    } else if (activeTab === 'parts') {
      const { data } = await supabase.from('parts').select('*').eq('machine_id', currentMachineId);
      setPanelData(prev => ({ ...prev, parts: data || [] }));
    } else if (activeTab === 'consumables') {
      const { data } = await supabase.from('consumables').select('*').eq('machine_id', currentMachineId);
      setPanelData(prev => ({ ...prev, consumables: data || [] }));
    }
    setIsLoading(false);
  }

  async function handleLogin(e) {
    e.preventDefault();
    setAuthError('');
    setIsAuthenticating(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setAuthError(error.message);
    setIsAuthenticating(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    navigate('/vault');
  }

  if (!session) {
    return (
      <MainLayout>
        <section style={{ padding: 'var(--space-64) 0', backgroundColor: 'var(--n-0)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--n-1)', padding: 'var(--space-32)', borderRadius: 'var(--radius-md)', border: 'var(--border-weight) solid var(--n-2)', width: '100%', maxWidth: '400px', boxShadow: '0 12px 36px rgba(0,0,0,0.1)' }}>
            <h1 style={{ fontSize: 'var(--text-31)', fontWeight: '700', fontFamily: 'var(--font-industrial)', marginBottom: 'var(--space-8)' }}>Staff Sign-in</h1>
            <p style={{ color: 'var(--n-3)', fontSize: 'var(--text-14)', marginBottom: 'var(--space-24)' }}>Access manuals, diagrams, and spare parts.</p>
            
            {authError && <div style={{ backgroundColor: 'var(--color-status-critical-bg)', color: 'var(--color-status-critical)', padding: 'var(--space-12)', borderRadius: 'var(--radius-sm)', marginBottom: 'var(--space-16)', fontSize: 'var(--text-14)' }}>{authError}</div>}
            
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-16)' }}>
              <div>
                <label style={{ display: 'block', fontSize: 'var(--text-12)', fontWeight: '600', color: 'var(--n-4)', marginBottom: 'var(--space-4)' }}>Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required style={{ width: '100%', padding: 'var(--space-12)', borderRadius: 'var(--radius-sm)', border: 'var(--border-weight) solid var(--n-2)', background: 'var(--n-0)' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 'var(--text-12)', fontWeight: '600', color: 'var(--n-4)', marginBottom: 'var(--space-4)' }}>Password</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} required style={{ width: '100%', padding: 'var(--space-12)', borderRadius: 'var(--radius-sm)', border: 'var(--border-weight) solid var(--n-2)', background: 'var(--n-0)' }} />
              </div>
              <button type="submit" disabled={isAuthenticating} style={{ background: 'var(--color-brand)', color: 'white', border: 'none', padding: 'var(--space-12)', borderRadius: 'var(--radius-sm)', fontWeight: '600', cursor: 'pointer', marginTop: 'var(--space-8)' }}>
                {isAuthenticating ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
          </div>
        </section>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <section style={{ padding: 'var(--space-64) 0', backgroundColor: 'var(--n-0)', minHeight: '100vh' }}>
        <div style={{ maxWidth: 'var(--content-width)', margin: '0 auto', padding: '0 var(--space-24)' }}>
          
          {/* Shell Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-32)', paddingBottom: 'var(--space-16)', borderBottom: 'var(--border-weight) solid var(--n-2)' }}>
            <div>
              <div style={{ fontSize: 'var(--text-20)', fontWeight: '700', color: 'var(--n-4)' }}>
                {user?.name || 'Loading...'}
                <span style={{ fontSize: 'var(--text-12)', fontWeight: '600', padding: '2px 8px', background: 'var(--n-2)', borderRadius: '999px', marginLeft: 'var(--space-12)', textTransform: 'uppercase' }}>{user?.role}</span>
              </div>
              <div style={{ color: 'var(--n-3)', fontSize: 'var(--text-14)', marginTop: 'var(--space-4)' }}>{user?.companies?.name}</div>
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-12)' }}>
              <button onClick={() => navigate('/dashboard')} style={{ background: 'var(--color-brand)', color: 'white', border: 'none', padding: 'var(--space-8) var(--space-16)', borderRadius: 'var(--radius-sm)', fontWeight: '600', cursor: 'pointer' }}>Dashboard</button>
              <button onClick={handleLogout} style={{ background: 'transparent', color: 'var(--n-4)', border: 'var(--border-weight) solid var(--n-2)', padding: 'var(--space-8) var(--space-16)', borderRadius: 'var(--radius-sm)', fontWeight: '600', cursor: 'pointer' }}>Log out</button>
            </div>
          </div>

          {/* Machine Picker */}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 'var(--space-16)', marginBottom: 'var(--space-32)' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: 'var(--text-12)', fontWeight: '600', color: 'var(--n-3)', marginBottom: 'var(--space-8)', textTransform: 'uppercase' }}>Select Machine</label>
              <select value={currentMachineId} onChange={e => setCurrentMachineId(e.target.value)} style={{ width: '100%', padding: 'var(--space-12)', borderRadius: 'var(--radius-sm)', border: 'var(--border-weight) solid var(--n-2)', background: 'var(--n-1)', fontSize: 'var(--text-16)' }}>
                {machines.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
            {user?.role === 'owner' && (
              <button style={{ background: 'var(--n-1)', color: 'var(--n-4)', border: 'var(--border-weight) solid var(--n-2)', padding: 'var(--space-12) var(--space-24)', borderRadius: 'var(--radius-sm)', fontWeight: '600', cursor: 'pointer' }}>+ Add Machine</button>
            )}
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 'var(--space-32)', borderBottom: 'var(--border-weight) solid var(--n-2)', marginBottom: 'var(--space-32)' }}>
            {['documents', 'parts', 'consumables'].map(tab => (
              <button 
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{ 
                  background: 'transparent', 
                  border: 'none', 
                  padding: 'var(--space-12) 0', 
                  fontSize: 'var(--text-16)', 
                  fontWeight: activeTab === tab ? '700' : '600', 
                  color: activeTab === tab ? 'var(--color-brand)' : 'var(--n-3)',
                  borderBottom: activeTab === tab ? '2px solid var(--color-brand)' : '2px solid transparent',
                  cursor: 'pointer',
                  textTransform: 'capitalize'
                }}
              >
                {tab === 'parts' ? 'Spare Parts' : tab}
              </button>
            ))}
          </div>

          {/* Panel Content (Card List Pattern) */}
          <div style={{ display: 'grid', gap: 'var(--space-16)' }}>
            {isLoading ? (
              <div style={{ padding: 'var(--space-32)', textAlign: 'center', color: 'var(--n-3)' }}>Loading {activeTab}...</div>
            ) : panelData[activeTab].length === 0 ? (
              <div style={{ padding: 'var(--space-32)', textAlign: 'center', color: 'var(--n-3)', background: 'var(--n-1)', borderRadius: 'var(--radius-md)', border: 'var(--border-weight) dashed var(--n-2)' }}>
                No {activeTab} found for this machine.
              </div>
            ) : (
              panelData[activeTab].map(item => (
                <div key={item.id} style={{ background: 'var(--n-1)', padding: 'var(--space-24)', borderRadius: 'var(--radius-md)', border: 'var(--border-weight) solid var(--n-2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 'var(--text-16)', fontWeight: '600', color: 'var(--n-4)', marginBottom: 'var(--space-4)' }}>
                      {item.title || item.part_name || item.name}
                    </div>
                    <div style={{ fontSize: 'var(--text-14)', color: 'var(--n-3)' }}>
                      {activeTab === 'documents' && <span style={{ background: 'var(--n-2)', padding: '2px 8px', borderRadius: '4px', fontSize: 'var(--text-12)', marginRight: 'var(--space-8)' }}>{item.category}</span>}
                      {activeTab === 'parts' && `Stock: ${item.qty_on_hand} ${item.unit || ''} | Reorder: ${item.reorder_level}`}
                      {activeTab === 'consumables' && `Stock: ${item.qty_on_hand} ${item.unit || ''} | Reorder: ${item.reorder_level}`}
                    </div>
                  </div>
                  <button style={{ background: 'transparent', color: 'var(--color-brand)', border: 'var(--border-weight) solid var(--color-brand)', padding: 'var(--space-8) var(--space-16)', borderRadius: 'var(--radius-sm)', fontWeight: '600', cursor: 'pointer' }}>
                    {activeTab === 'documents' ? 'View' : 'Manage'}
                  </button>
                </div>
              ))
            )}
          </div>

        </div>
      </section>
    </MainLayout>
  );
}
