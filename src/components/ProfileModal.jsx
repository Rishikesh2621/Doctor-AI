import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Save, Activity, Calendar } from 'lucide-react';

const ProfileModal = ({ isOpen, onClose, userDetails, onSave }) => {
    const [formData, setFormData] = useState(userDetails);
    const [isEditing, setIsEditing] = useState(false);

    useEffect(() => {
        setFormData(userDetails);
        setIsEditing(false); // Reset to read-only when opening
    }, [userDetails, isOpen]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
        setIsEditing(false);
        onClose();
    };

    const toggleEdit = () => {
        if (isEditing) {
            // Cancel edit - revert
            setFormData(userDetails);
        }
        setIsEditing(!isEditing);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[1000]"
                        onClick={onClose}
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, x: "-50%", y: "-45%" }}
                        animate={{ opacity: 1, scale: 1, x: "-50%", y: "-50%" }}
                        exit={{ opacity: 0, scale: 0.95, x: "-50%", y: "-45%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="fixed top-1/2 left-1/2 w-full max-w-md max-h-[90vh] bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl z-[1001] flex flex-col"
                    >
                        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900 flex-shrink-0 rounded-t-2xl">
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                <User className="w-5 h-5 text-primary" />
                                Patient Profile
                            </h2>
                            <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="overflow-y-auto custom-scrollbar p-6">
                            <form onSubmit={(e) => { e.preventDefault(); if (isEditing) handleSubmit(e); }} className="space-y-4">
                                <div className="space-y-1">
                                    <label className="block text-sm font-medium text-slate-400">Full Name</label>
                                    <div className="relative">
                                        <User className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isEditing ? 'text-slate-500' : 'text-slate-600'}`} />
                                        <input
                                            type="text"
                                            name="name"
                                            value={formData.name}
                                            onChange={handleChange}
                                            disabled={!isEditing}
                                            placeholder={isEditing ? "Enter your name" : "Not specified"}
                                            className={`w-full bg-slate-800 text-white rounded-xl pl-10 pr-4 py-3 border ${isEditing ? 'border-slate-700 focus:border-primary focus:ring-1 focus:ring-primary' : 'border-transparent cursor-not-allowed text-slate-300'} placeholder-slate-600 outline-none transition-all`}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="block text-sm font-medium text-slate-400">Age</label>
                                        <div className="relative">
                                            <Calendar className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isEditing ? 'text-slate-500' : 'text-slate-600'}`} />
                                            <input
                                                type="number"
                                                name="age"
                                                value={formData.age}
                                                onChange={handleChange}
                                                disabled={!isEditing}
                                                placeholder={isEditing ? "Age" : "-"}
                                                className={`w-full bg-slate-800 text-white rounded-xl pl-10 pr-4 py-3 border ${isEditing ? 'border-slate-700 focus:border-primary focus:ring-1 focus:ring-primary' : 'border-transparent cursor-not-allowed text-slate-300'} placeholder-slate-600 outline-none transition-all`}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="block text-sm font-medium text-slate-400">Gender</label>
                                        <select
                                            name="gender"
                                            value={formData.gender}
                                            onChange={handleChange}
                                            disabled={!isEditing}
                                            className={`w-full bg-slate-800 text-white rounded-xl px-4 py-3 border ${isEditing ? 'border-slate-700 focus:border-primary focus:ring-1 focus:ring-primary' : 'border-transparent cursor-not-allowed text-slate-300'} outline-none transition-all appearance-none`}
                                        >
                                            <option value="">Select Gender</option>
                                            <option value="Male">Male</option>
                                            <option value="Female">Female</option>
                                            <option value="Other">Other</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className="block text-sm font-medium text-slate-400">Medical History / Allergies</label>
                                    <div className="relative">
                                        <Activity className={`absolute left-3 top-3 w-4 h-4 ${isEditing ? 'text-slate-500' : 'text-slate-600'}`} />
                                        <textarea
                                            name="medicalHistory"
                                            value={formData.medicalHistory}
                                            onChange={handleChange}
                                            disabled={!isEditing}
                                            placeholder={isEditing ? "e.g., Diabetes, Penicillin allergy, Hypertension..." : "None specified"}
                                            rows="3"
                                            className={`w-full bg-slate-800 text-white rounded-xl pl-10 pr-4 py-3 border ${isEditing ? 'border-slate-700 focus:border-primary focus:ring-1 focus:ring-primary' : 'border-transparent cursor-not-allowed text-slate-300'} placeholder-slate-600 outline-none transition-all resize-none`}
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-3 pt-2">
                                    {isEditing ? (
                                        <>
                                            <button
                                                type="button"
                                                onClick={toggleEdit}
                                                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-xl transition-all border border-slate-700"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="submit"
                                                className="flex-1 py-3 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
                                            >
                                                <Save className="w-5 h-5" />
                                                Save
                                            </button>
                                        </>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => setIsEditing(true)}
                                            className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-all border border-slate-700 hover:border-slate-600 shadow-lg flex items-center justify-center gap-2"
                                        >
                                            <span>Edit Profile</span>
                                        </button>
                                    )}
                                </div>

                                {isEditing && (
                                    <p className="text-xs text-center text-slate-500 animate-pulse">
                                        Dr. AI uses these details to improve diagnosis accuracy.
                                    </p>
                                )}
                            </form>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default ProfileModal;
