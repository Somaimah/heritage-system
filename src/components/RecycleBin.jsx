import React, { useEffect, useState } from "react";
import { db } from "../firebase/firebase";
import { collection, query, where, onSnapshot, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { RotateCcw, Trash2, Search, AlertCircle, Loader2 } from "lucide-react";

// Context & Components
import { useToast } from "../components/ToastContext";
import ConfirmationModal from "../components/ConfirmationModal";

const RecycleBin = ({ role, changePage }) => {
  const { showToast } = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // --- Universal Modal State ---
  const [confirmConfig, setConfirmConfig] = useState({
    isOpen: false,
    title: "",
    message: "",
    type: "warning",
    confirmText: "",
    onConfirm: () => {},
  });

  const closeConfirm = () => setConfirmConfig({ ...confirmConfig, isOpen: false });

  // Determine which collection to look at based on the role
  const targetCollection = role === "moderator" ? "proverb" : "culturalItems";
  const itemLabel = role === "moderator" ? "Proverb" : "Cultural Item";

  useEffect(() => {
    const q = query(
      collection(db, targetCollection),
      where("status", "==", "archived")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setItems(list);
      setLoading(false);
    }, (err) => {
      showToast("Failed to sync bin data: " + err.message, "error");
      setLoading(false);
    });

    return () => unsubscribe();
  }, [targetCollection, showToast]);

  const handleRestore = (item) => {
    setConfirmConfig({
      isOpen: true,
      title: "Restore Record",
      message: `Are you sure you want to restore "${item.title || item.term}" back to the active archive?`,
      type: "restore",
      confirmText: "Restore Now",
      onConfirm: async () => {
        setIsProcessing(true);
        try {
          await updateDoc(doc(db, targetCollection, item.id), {
            status: "posted",
            archivedAt: null 
          });
          showToast(`${itemLabel} successfully restored to the archive.`, "success");
        } catch (err) {
          showToast("Restoration failed: " + err.message, "error");
        } finally {
          setIsProcessing(false);
          closeConfirm();
        }
      }
    });
  };

  const handlePermanentDelete = (item) => {
    setConfirmConfig({
      isOpen: true,
      title: "Permanent Deletion",
      message: `WARNING: "${item.title || item.term}" will be permanently deleted. This cannot be undone. Proceed?`,
      type: "danger",
      confirmText: "Delete Data",
      onConfirm: async () => {
        setIsProcessing(true);
        try {
          await deleteDoc(doc(db, targetCollection, item.id));
          showToast("Record permanently deleted from system.", "success");
        } catch (err) {
          showToast("Critical Error: Could not delete record. " + err.message, "error");
        } finally {
          setIsProcessing(false);
          closeConfirm();
        }
      }
    });
  };

  const filteredItems = items.filter(item => 
    (item.title || item.term || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 md:p-10 animate-fadeIn">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#4A0C16] font-serif uppercase tracking-tight">
            Recycle Bin <span className="text-[#E09F26]">({itemLabel}s)</span>
          </h2>
          <p className="text-gray-500 text-sm italic">Items here are hidden from the public. You can restore or permanently delete them.</p>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Search deleted items..." 
            className="pl-10 pr-4 py-2 border border-gray-200 rounded-xl w-full md:w-64 focus:ring-2 focus:ring-[#E09F26] outline-none transition-all text-sm"
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="animate-spin text-[#E09F26]" size={32} />
          <div className="text-gray-400 uppercase tracking-widest text-xs font-bold">Synchronizing Bin...</div>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-gray-200 rounded-3xl py-20 flex flex-col items-center justify-center text-gray-400">
          <AlertCircle size={48} className="mb-4 opacity-20" />
          <p className="font-bold uppercase tracking-widest text-sm">Recycle Bin is Empty</p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#4A0C16] text-white text-[10px] uppercase tracking-[0.2em] font-bold">
                <th className="px-6 py-4">Item Name</th>
                <th className="px-6 py-4">Deleted Date</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredItems.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="px-6 py-5">
                    <p className="font-bold text-[#4A0C16] text-sm">{item.title || item.term}</p>
                    <p className="text-[10px] text-gray-400 font-semibold uppercase">{item.category}</p>
                  </td>
                  <td className="px-6 py-5 text-gray-500 text-xs font-medium">
                    {item.archivedAt?.toDate().toLocaleDateString() || "Unknown"}
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex justify-end gap-2">
                      <button 
                        disabled={isProcessing}
                        onClick={() => handleRestore(item)}
                        className="p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-600 hover:text-white transition-all shadow-sm disabled:opacity-50"
                        title="Restore"
                      >
                        <RotateCcw size={16} />
                      </button>
                      <button 
                        disabled={isProcessing}
                        onClick={() => handlePermanentDelete(item)}
                        className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-600 hover:text-white transition-all shadow-sm disabled:opacity-50"
                        title="Delete Permanently"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Inject the custom modal at the bottom */}
      <ConfirmationModal 
        isOpen={confirmConfig.isOpen} 
        config={confirmConfig} 
        onClose={closeConfirm} 
      />
    </div>
  );
};

export default RecycleBin;