import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import AppShell from '../components/AppShell';
import { FileText, Upload, Download, Trash2, Search, File, FileCode, Archive, FileIcon } from 'lucide-react';

export default function Vault() {
  const [documents, setDocuments] = useState([]);
  const [machines, setMachines] = useState([]);
  const [selectedMachine, setSelectedMachine] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState('');

  // Upload Form State
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('manual');

  useEffect(() => {
    fetchMachines();
  }, []);

  useEffect(() => {
    if (selectedMachine) {
      fetchDocuments();
    } else {
      setDocuments([]);
    }
  }, [selectedMachine]);

  const fetchMachines = async () => {
    const { data } = await supabase.from('machines').select('id, name');
    setMachines(data || []);
    if (data && data.length > 0) {
      setSelectedMachine(data[0].id);
    }
    setLoading(false);
  };

  const fetchDocuments = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('machine_id', selectedMachine)
      .order('created_at', { ascending: false });
    
    if (!error) {
      setDocuments(data || []);
    }
    setLoading(false);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file || !title || !selectedMachine) return;
    setUploading(true);
    
    try {
      const filePath = `${selectedMachine}/${Date.now()}_${file.name}`;
      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from('machine-documents')
        .upload(filePath, file);

      if (uploadErr) throw uploadErr;

      const { error: insertErr } = await supabase.from('documents').insert({
        machine_id: selectedMachine,
        title,
        category,
        file_url: uploadData.path,
      });

      if (insertErr) throw insertErr;

      setFile(null);
      setTitle('');
      fetchDocuments();
    } catch (err) {
      alert('Upload failed: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (doc) => {
    if (doc.file_url.startsWith('http')) {
      window.open(doc.file_url, '_blank');
      return;
    }
    const { data, error } = await supabase.storage
      .from('machine-documents')
      .createSignedUrl(doc.file_url, 300);
    
    if (error) {
      alert('Could not generate download link.');
    } else {
      window.open(data.signedUrl, '_blank');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this document?')) return;
    await supabase.from('documents').delete().eq('id', id);
    fetchDocuments();
  };

  const filteredDocs = documents.filter(doc => 
    doc.title.toLowerCase().includes(search.toLowerCase()) || 
    doc.category.toLowerCase().includes(search.toLowerCase())
  );

  const getIcon = (cat) => {
    switch (cat) {
      case 'manual': return <FileText className="text-blue-500" />;
      case 'circuit_diagram': return <FileCode className="text-emerald-500" />;
      case 'hydraulic_diagram': return <Archive className="text-amber-500" />;
      default: return <File className="text-gray-500" />;
    }
  };

  const CATEGORY_LABELS = {
    manual: 'Manual',
    circuit_diagram: 'Circuit Diagram',
    hydraulic_diagram: 'Hydraulic Diagram',
    spare_parts_catalog: 'Spare Parts Catalog',
    other: 'Other'
  };

  return (
    <AppShell title="Data Vault">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header Controls */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="w-full md:w-1/3">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Select Machine</label>
            <select 
              value={selectedMachine} 
              onChange={(e) => setSelectedMachine(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-gray-800 font-medium focus:ring-2 focus:ring-blue-500"
            >
              {machines.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>
          <div className="w-full md:w-1/3 relative">
             <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Search</label>
             <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input 
                  type="text" 
                  placeholder="Search manuals..." 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500"
                />
             </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Upload Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 p-6 rounded-2xl shadow-sm">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><Upload size={18} className="text-blue-600"/> Upload Document</h3>
              <form onSubmit={handleUpload} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                  <input type="text" required value={title} onChange={e => setTitle(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white" placeholder="e.g. Operator Manual V2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select value={category} onChange={e => setCategory(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white">
                    {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">File</label>
                  <input type="file" required onChange={e => setFile(e.target.files[0])} className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200" />
                </div>
                <button type="submit" disabled={uploading || !file || !title} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-xl transition-colors disabled:opacity-50 flex justify-center items-center gap-2">
                  {uploading ? 'Uploading...' : 'Upload File'}
                </button>
              </form>
            </div>
          </div>

          {/* Document List */}
          <div className="lg:col-span-2">
             <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-2 min-h-[400px]">
                {loading ? (
                  <div className="flex justify-center items-center h-48 text-gray-400">Loading documents...</div>
                ) : filteredDocs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-64 text-gray-400 border-2 border-dashed border-gray-100 m-4 rounded-2xl">
                    <FileIcon size={48} className="opacity-20 mb-2"/>
                    <p>No documents found.</p>
                  </div>
                ) : (
                  <div className="space-y-2 p-2">
                    {filteredDocs.map(doc => (
                      <div key={doc.id} className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-xl border border-transparent hover:border-gray-100 transition-colors group">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0">
                            {getIcon(doc.category)}
                          </div>
                          <div>
                            <h4 className="font-bold text-gray-900 text-sm md:text-base">{doc.title}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{CATEGORY_LABELS[doc.category] || doc.category}</span>
                              <span className="text-xs text-gray-400">{new Date(doc.created_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => handleDownload(doc)} className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Download size={18}/></button>
                          <button onClick={() => handleDelete(doc.id)} className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={18}/></button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
             </div>
          </div>
        </div>

      </div>
    </AppShell>
  );
}
