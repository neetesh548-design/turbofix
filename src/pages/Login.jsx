import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { Mail, Lock, Building, User, Phone, Upload, ArrowRight, CheckCircle } from 'lucide-react';

export default function Login() {
  const [view, setView] = useState('login'); // 'login' or 'register'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const navigate = useNavigate();

  // Login form state
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');

  // Register form state
  const [companyCode, setCompanyCode] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [phone, setPhone] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [email, setEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [screenshot, setScreenshot] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const loginEmail = identifier.includes('@') ? identifier : `${identifier}@phone.turbofix.co.in`;
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password,
      });

      if (signInError) throw signInError;

      const authUser = data.user;
      const meta = authUser.user_metadata || {};
      let appUser = {
        user_id: meta.user_id || authUser.id,
        name: meta.name || meta.full_name || loginEmail.split('@')[0],
        role: meta.role || 'owner',
        company_code: meta.company_code || '',
      };

      if (!meta.role) {
        const { data: profileRows } = await supabase.from('users').select('id,name,role,company_id').eq('email', identifier.includes('@') ? identifier : null).limit(1);
        if (profileRows && profileRows.length > 0) {
          appUser = { ...appUser, ...profileRows[0], user_id: profileRows[0].id || appUser.user_id };
        }
      }

      localStorage.setItem('tf_token', data.session.access_token);
      localStorage.setItem('tf_user', JSON.stringify(appUser));
      window.dispatchEvent(new Event('authChanged'));
      
      navigate('/dashboard.html', { replace: true });
    } catch (err) {
      setError(err.message || 'Invalid credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      if (!screenshot) throw new Error('Payment screenshot is required.');
      if (regPassword.length < 8) throw new Error('Password must be at least 8 characters.');

      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password: regPassword,
        options: {
          data: {
            name: ownerName,
            role: 'owner',
            company_code: companyCode.toUpperCase(),
            company_name: companyName,
            phone,
          }
        }
      });
      if (signUpError) throw signUpError;

      if (data.user) {
        await supabase.from('companies').insert({
          name: companyName,
          domain: companyCode.toLowerCase(),
          status: 'pending',
        });
        // We skip uploading the screenshot to storage for this demo
      }

      setSuccess('Your company has been registered. A TurboFix admin will review and approve your account.');
      
      // Reset form
      setCompanyCode(''); setCompanyName(''); setPhone(''); setOwnerName(''); setEmail(''); setRegPassword(''); setScreenshot(null);
      
    } catch (err) {
      setError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />
      <div className="flex-1 flex flex-col justify-center items-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="p-8">
            {view === 'login' ? (
              <>
                <div className="text-center mb-8">
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">Staff Sign-In</h1>
                  <p className="text-gray-500 text-sm">Access your TurboFix enterprise portal.</p>
                </div>

                {error && <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-600 rounded-lg text-sm">{error}</div>}

                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone or email</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                      <input 
                        type="text" 
                        required
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                      <input 
                        type="password" 
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                      />
                    </div>
                  </div>
                  <button 
                    type="submit" 
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl transition-colors disabled:opacity-70"
                  >
                    {loading ? 'Signing in...' : 'Sign In'}
                    {!loading && <ArrowRight size={18} />}
                  </button>
                </form>

                <div className="mt-6 text-center">
                  <button onClick={() => setView('register')} className="text-blue-600 text-sm font-medium hover:underline">
                    New here? Register your company
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="text-center mb-6">
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">Register Company</h1>
                  <p className="text-gray-500 text-sm">Create an owner account for your factory.</p>
                </div>

                {error && <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-600 rounded-lg text-sm">{error}</div>}
                {success && <div className="mb-4 p-3 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-lg text-sm flex gap-2"><CheckCircle size={18}/> {success}</div>}

                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Company Code</label>
                      <input type="text" required placeholder="e.g. ACME" value={companyCode} onChange={(e) => setCompanyCode(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm uppercase" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                      <input type="text" required placeholder="Acme Ltd." value={companyName} onChange={(e) => setCompanyName(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Owner Name</label>
                    <input type="text" required value={ownerName} onChange={(e) => setOwnerName(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                      <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                      <input type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                    <input type="password" required minLength={8} value={regPassword} onChange={(e) => setRegPassword(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Payment Screenshot</label>
                    <input type="file" required accept="image/*" onChange={(e) => setScreenshot(e.target.files[0])} className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                  </div>

                  <button 
                    type="submit" 
                    disabled={loading}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl transition-colors disabled:opacity-70 mt-2"
                  >
                    {loading ? 'Registering...' : 'Register'}
                  </button>
                </form>

                <div className="mt-6 text-center">
                  <button onClick={() => setView('login')} className="text-gray-500 text-sm font-medium hover:text-gray-800">
                    Back to Sign In
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
