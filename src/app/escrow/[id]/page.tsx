'use client';

import { Navbar } from "@/components/Navbar";
import { useWallet } from "@/components/providers/WalletProvider";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, getDocs, updateDoc, addDoc, serverTimestamp, orderBy } from "firebase/firestore";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { Shield, CheckCircle, Clock, ArrowRight, ShieldAlert, Upload, Loader2 } from "lucide-react";
import { approveEscrow, deployContract, fundEscrow } from "@/lib/algorandService";
import { algodClient } from "@/lib/algorand";

export const dynamic = 'force-dynamic';

export default function EscrowDetail() {
    const { id } = useParams();
    const { address, isBanned, isAdminSession, walletFlags, signTransactions, walletName } = useWallet();
    const [project, setProject] = useState<any>(null);
    const [milestones, setMilestones] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [showReport, setShowReport] = useState(false);
    const [reportReason, setReportReason] = useState("");
    const [reportFile, setReportFile] = useState<File | null>(null);
    const [reportSubmitting, setReportSubmitting] = useState(false);

    const [approvingMilestone, setApprovingMilestone] = useState<string | null>(null);
    const [deployingContract, setDeployingContract] = useState(false);

    useEffect(() => {
        if (id) fetchProject();
    }, [id]);

    const fetchProject = async () => {
        if (!id) return;
        setLoading(true);
        try {
            const pSnap = await getDoc(doc(db, "escrows", id as string));
            if (pSnap.exists()) {
                setProject({ id: pSnap.id, ...pSnap.data() });

                const mq = query(
                    collection(db, "milestones"),
                    where("escrow_id", "==", id),
                    orderBy("milestone_index")
                );
                const mSnap = await getDocs(mq);
                setMilestones(mSnap.docs.map(d => ({ id: d.id, ...d.data() })));
            }
        } catch (error) {
            console.error("Error fetching project from Firestore:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleReport = async () => {
        if (!reportReason || !address || isBanned || !id) return;
        setReportSubmitting(true);
        try {
            let evidenceUrl = "";
            if (reportFile) {
                evidenceUrl = await uploadToCloudinary(reportFile);
            }

            await addDoc(collection(db, "complaints"), {
                escrow_id: id,
                raised_by_wallet: address,
                against_wallet: project.client_wallet,
                description: reportReason,
                evidence_url: evidenceUrl,
                status: 'open',
                created_at: serverTimestamp()
            });

            alert("Complaint raised successfully! Administrators will review it.");
            setShowReport(false);
            setReportReason("");
            setReportFile(null);
        } catch (error: any) {
            alert("Failed to submit complaint: " + error.message);
        } finally {
            setReportSubmitting(false);
        }
    };

    const submitWork = async (milestoneId: string) => {
        if (isBanned) {
            alert("Action failed: Your wallet has been suspended.");
            return;
        }
        try {
            await updateDoc(doc(db, "milestones", milestoneId), {
                submitted_at: serverTimestamp()
            });
            fetchProject();
        } catch (error: any) {
            alert("Failed to submit work: " + error.message);
        }
    };

    const approveMilestone = async (milestoneId: string) => {
        if (isBanned) {
            alert("Action failed: Your wallet has been suspended.");
            return;
        }
        if (!address || !signTransactions || !project?.contract_address) {
            alert("Unable to process approval. Please ensure wallet is connected and contract is deployed.");
            return;
        }

        if (!project.freelancer_wallet) {
            alert("Freelancer wallet address is missing from project data.");
            return;
        }

        try {
            setApprovingMilestone(milestoneId);

            // Parse app ID from contract address (format: XXXXXXXXX where X is digits)
            const appId = parseInt(project.contract_address, 10);
            if (isNaN(appId)) {
                alert("Invalid contract address format");
                return;
            }

            await approveEscrow(signTransactions, address, appId, milestoneId, project.freelancer_wallet);
            alert("Milestone approved successfully!");
            fetchProject();
        } catch (error: any) {
            console.error("Approval error:", error);
            // Show detailed error message if available
            const msg = error.message || "Unknown error";
            alert("Failed to approve milestone: " + msg);
        } finally {
            setApprovingMilestone(null);
        }
    };

    const deployContractHandler = async () => {
        if (isBanned) {
            alert("Action failed: Your wallet has been suspended.");
            return;
        }
        if (!address || !signTransactions || !project || !id) {
            alert("Unable to deploy. Please ensure wallet is connected.");
            return;
        }

        try {
            setDeployingContract(true);

            // Fetch TEAL files
            const [approvalResponse, clearResponse] = await Promise.all([
                fetch('/teal/escrow_approval.teal'),
                fetch('/teal/escrow_clear.teal')
            ]);

            if (!approvalResponse.ok || !clearResponse.ok) {
                throw new Error('Failed to load contract files');
            }

            const approvalText = await approvalResponse.text();
            const clearText = await clearResponse.text();

            // Use algod client to compile TEAL to bytecode
            const compiledApproval = await algodClient.compile(approvalText).do();
            const compiledClear = await algodClient.compile(clearText).do();

            const approvalBytecode = new Uint8Array(Buffer.from(compiledApproval.result, 'base64'));
            const clearBytecode = new Uint8Array(Buffer.from(compiledClear.result, 'base64'));

            // Calculate milestone parameters
            const milestonesCount = milestones.length;
            const amountPerMilestone = project.total_amount / milestonesCount;

            // Deploy the contract
            const { appId, appAddress } = await deployContract(
                signTransactions,
                address,
                project.freelancer_wallet,
                milestonesCount,
                Math.floor(amountPerMilestone * 1_000_000), // Convert to microAlgos
                approvalBytecode,
                clearBytecode
            );

            // Fund the contract - need to add extra for:
            // 1. Minimum balance of app account (~100,000 microAlgos)
            // 2. Transaction fees and safety margin
            const MIN_BALANCE_MICROALGOS = 100_000;
            const SAFETY_MARGIN_MICROALGOS = 50_000; // Extra buffer for fees and safety
            const amountMicroAlgos = (project.total_amount * 1_000_000) + MIN_BALANCE_MICROALGOS + SAFETY_MARGIN_MICROALGOS;
            await fundEscrow(signTransactions, address, appAddress, amountMicroAlgos);

            // Update Firestore with contract details
            await updateDoc(doc(db, "escrows", id as string), {
                contract_address: appId.toString(),
                app_id: appId,
                app_address: appAddress,
                status: 'funded'
            });

            alert("Contract deployed and funded successfully!");
            fetchProject();
        } catch (error: any) {
            console.error("Deployment error:", error);
            alert("Failed to deploy contract: " + error.message);
        } finally {
            setDeployingContract(false);
        }
    };

    if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">Loading escrow...</div>;
    if (!project) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">Escrow not found</div>;

    const isClient = address === project.client_wallet;
    const isFreelancer = address === project.freelancer_wallet;

    // Prerequisite Checklist for Complaints
    const hasUnpaidWork = milestones.some((m: any) => m.submitted_at !== null && m.status === 'pending');
    const hasUnfairRefund = project.status === 'refunded';
    const canReport = isFreelancer && (hasUnpaidWork || hasUnfairRefund);

    return (
        <div className="min-h-screen pb-20">
            <Navbar />

            <div className="pt-32 px-6 max-w-5xl mx-auto">
                {/* Project Header */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
                    <div className="lg:col-span-2">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <span className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-xs font-bold uppercase tracking-wider">
                                    {project.status}
                                </span>
                                <span className="text-slate-500 text-sm font-mono">ID: {project.id.slice(0, 8)}</span>
                            </div>

                            {canReport && (
                                <button
                                    onClick={() => setShowReport(true)}
                                    className="text-xs font-bold text-orange-400 bg-orange-500/10 hover:bg-orange-500/20 transition-colors px-3 py-1.5 rounded-lg flex items-center gap-1.5"
                                >
                                    <ShieldAlert size={14} /> Raise Complaint
                                </button>
                            )}
                        </div>
                        <h1 className="text-5xl font-bold mb-6 text-white uppercase tracking-tighter">
                            Escrow <span className="text-blue-500 font-mono">#{project.id.slice(0, 8)}</span>
                        </h1>

                        <div className="flex flex-wrap gap-4">
                            <div className="px-6 py-4 glass rounded-2xl flex-1 min-w-[200px]">
                                <span className="text-xs font-bold text-slate-500 uppercase block mb-1">Total Locked</span>
                                <span className="text-2xl font-bold font-mono text-blue-100">{project.total_amount} ALGO</span>
                            </div>
                            <div className="px-6 py-4 glass rounded-2xl flex-1 min-w-[200px]">
                                <span className="text-xs font-bold text-slate-500 uppercase block mb-1">Contract Address</span>
                                <span className="text-2xl font-bold font-mono text-purple-100">{project.contract_address || 'Not Deployed'}</span>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="glass-card">
                            <h3 className="text-sm font-bold text-slate-500 uppercase mb-4">Stakeholders</h3>
                            <div className="space-y-4">
                                <div className="flex items-start gap-3">
                                    <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                                        <Shield size={20} />
                                    </div>
                                    <div className="overflow-hidden">
                                        <p className="text-xs font-bold text-slate-500">Client</p>
                                        <p className="text-sm font-mono truncate">{project.client_wallet}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <div className="p-2 bg-green-500/10 rounded-lg text-green-400">
                                        <Shield size={20} />
                                    </div>
                                    <div className="overflow-hidden">
                                        <p className="text-xs font-bold text-slate-500">Freelancer</p>
                                        <p className="text-sm font-mono truncate">{project.freelancer_wallet}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {project.status === 'funded' && isClient && !isAdminSession && !project.contract_address && (
                            <button
                                onClick={deployContractHandler}
                                disabled={deployingContract || isBanned}
                                className={`btn-primary w-full py-4 justify-center flex items-center gap-2 ${deployingContract || isBanned ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                {deployingContract ? (
                                    <>
                                        <Loader2 size={20} className="animate-spin" />
                                        Deploying & Funding...
                                    </>
                                ) : (
                                    <>
                                        Fund & Deploy Escrow <ArrowRight size={20} />
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                </div>

                {/* Milestones Sidebar/Timeline */}
                <h2 className="text-3xl font-bold mb-8">Project Milestones</h2>
                <div className="space-y-6">
                    {milestones.map((m, i) => (
                        <div key={m.id} className={`glass-card flex flex-col md:flex-row justify-between items-center gap-6 border-l-4 ${m.status === 'paid' ? 'border-green-500' :
                            m.status === 'approved' ? 'border-blue-500' : 'border-slate-700'
                            }`}>
                            <div className="flex items-center gap-6 flex-1 w-full">
                                <div className={`w-12 h-12 flex items-center justify-center rounded-2xl font-bold ${m.status === 'paid' ? 'bg-green-500/20 text-green-400' :
                                    m.status === 'approved' ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-800 text-slate-500'
                                    }`}>
                                    {i + 1}
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold mb-1">{m.title}</h3>
                                    <div className="flex items-center gap-2 text-sm text-slate-400 font-mono">
                                        <span>{m.amount} ALGO</span>
                                        <span>•</span>
                                        <span className="capitalize">{m.status}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 w-full md:w-auto">
                                {m.status === 'pending' && isClient && m.submitted_at && !isAdminSession && project.contract_address && project.contract_address !== 'Not Deployed' && (
                                    <button
                                        disabled={isBanned || approvingMilestone === m.id}
                                        onClick={() => approveMilestone(m.id)}
                                        className={`btn-primary py-2 px-6 text-sm flex-1 md:flex-none justify-center border-orange-500/50 hover:bg-orange-500/10 hover:text-orange-400 bg-transparent text-orange-500 flex items-center gap-2 ${isBanned || approvingMilestone === m.id ? 'opacity-50 cursor-not-allowed grayscale' : ''}`}
                                    >
                                        {approvingMilestone === m.id ? (
                                            <>
                                                <Loader2 size={16} className="animate-spin" />
                                                Processing...
                                            </>
                                        ) : isBanned ? (
                                            'Action Restricted'
                                        ) : (
                                            'Review & Approve Payout'
                                        )}
                                    </button>
                                )}
                                {m.status === 'pending' && isClient && m.submitted_at && !isAdminSession && (!project.contract_address || project.contract_address === 'Not Deployed') && (
                                    <div className="flex items-center gap-2 text-slate-500 font-bold text-sm px-4 italic border border-slate-800 rounded-xl py-2">
                                        <Clock size={18} /> Contract Not Deployed
                                    </div>
                                )}
                                {m.status === 'pending' && isClient && !m.submitted_at && (
                                    <div className="flex items-center gap-2 text-slate-500 font-bold text-sm px-4 italic border border-slate-800 rounded-xl py-2">
                                        <Clock size={18} /> Awaiting Freelancer Work
                                    </div>
                                )}
                                {m.status === 'paid' && (
                                    <div className="flex items-center gap-2 text-green-400 font-bold text-sm px-4">
                                        <CheckCircle size={18} /> Paid
                                    </div>
                                )}
                                {m.status === 'pending' && isFreelancer && !m.submitted_at && !isAdminSession && (
                                    <button
                                        disabled={isBanned}
                                        onClick={() => submitWork(m.id)}
                                        className={`btn-primary py-2 px-6 text-sm flex-1 md:flex-none justify-center ${isBanned ? 'opacity-50 cursor-not-allowed grayscale' : ''}`}
                                    >
                                        {isBanned ? 'Wallet Suspended' : 'Mark as Completed'}
                                    </button>
                                )}
                                {m.status === 'pending' && isFreelancer && m.submitted_at && (
                                    <div className="flex items-center gap-2 text-orange-400 font-bold text-sm px-4 italic border border-orange-500/30 rounded-xl py-2 bg-orange-500/5">
                                        <Clock size={18} /> Awaiting Client Approval
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Report Modal */}
            {showReport && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
                    <div className="glass-card w-full max-w-md relative">
                        <h2 className="text-2xl font-bold mb-4 text-orange-400 flex items-center gap-2">
                            <ShieldAlert /> File a Report
                        </h2>
                        <p className="text-slate-400 text-sm mb-6">
                            If you encountered an issue with this escrow, please detail it below. Evidence is required for admin review.
                        </p>
                        <textarea
                            value={reportReason}
                            onChange={(e) => setReportReason(e.target.value)}
                            placeholder="Describe how the client has acted unfairly..."
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl p-4 mb-4 min-h-[100px] focus:outline-none focus:border-blue-500 text-sm"
                        ></textarea>

                        <div className="mb-6">
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Evidence Screenshot</label>
                            <div className="relative border-2 border-dashed border-slate-800 rounded-xl p-4 hover:border-blue-500/50 transition-colors group cursor-pointer">
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => setReportFile(e.target.files?.[0] || null)}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                />
                                <div className="flex items-center gap-3 text-slate-400 group-hover:text-blue-400 transition-colors">
                                    <Upload size={20} />
                                    <span className="text-sm truncate">
                                        {reportFile ? reportFile.name : 'Click to upload proof'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <button
                                onClick={() => setShowReport(false)}
                                className="flex-1 py-3 px-4 rounded-xl text-slate-400 font-bold hover:bg-slate-800 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleReport}
                                disabled={reportSubmitting || !reportReason.trim() || !reportFile}
                                className="flex-1 py-3 px-4 rounded-xl text-white font-bold bg-orange-600 hover:bg-orange-500 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                            >
                                {reportSubmitting ? (
                                    <>
                                        <Loader2 className="animate-spin" size={18} />
                                        Submitting...
                                    </>
                                ) : 'Submit Report'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
