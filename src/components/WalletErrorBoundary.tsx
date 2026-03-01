'use client';

import React, { Component, ReactNode } from 'react';

interface Props {
    children?: ReactNode;
}

interface State {
    hasError: boolean;
    showToast: boolean;
}

export default class WalletErrorBoundary extends Component<Props, State> {
    private autoDismissTimer: NodeJS.Timeout | null = null;

    public state: State = {
        hasError: false,
        showToast: false,
    };

    public static getDerivedStateFromError(_: Error): State {
        return { hasError: true, showToast: false };
    }

    public componentDidCatch(error: Error) {
        if (error.name === 'WalletDisconnectedError') {
            this.setState({ hasError: false, showToast: true });
        } else {
            this.setState({ hasError: true, showToast: false });
        }
    }

    public componentDidUpdate(prevProps: Props, prevState: State) {
        if (!prevState.showToast && this.state.showToast) {
            this.autoDismissTimer = setTimeout(() => {
                this.setState({ showToast: false });
            }, 8000);
        }
    }

    public componentWillUnmount() {
        if (this.autoDismissTimer) {
            clearTimeout(this.autoDismissTimer);
        }
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="flex items-center justify-center min-h-screen bg-slate-950 text-slate-50">
                    <div className="text-center p-8 bg-slate-900 rounded-2xl border border-slate-800">
                        <h2 className="text-xl font-bold mb-4">Something went wrong.</h2>
                        <button
                            onClick={() => window.location.reload()}
                            className="px-6 py-2 bg-indigo-500 hover:bg-indigo-600 rounded-xl transition-colors font-medium"
                        >
                            Please refresh
                        </button>
                    </div>
                </div>
            );
        }

        return (
            <>
                {this.props.children}

                {this.state.showToast && (
                    <div className="fixed bottom-6 right-6 z-[9999] bg-slate-900 border border-slate-700 shadow-2xl rounded-2xl p-5 w-80 animate-in slide-in-from-bottom-5">
                        <div className="flex items-start gap-4">
                            <div className="text-orange-500 text-xl pt-0.5">⚠️</div>
                            <div className="flex-1">
                                <h3 className="font-bold text-slate-100 flex items-center justify-between">
                                    Wallet Disconnected
                                    <button
                                        onClick={() => this.setState({ showToast: false })}
                                        className="text-xs text-slate-500 hover:text-slate-300 font-normal ml-2"
                                    >
                                        ✕ Dismiss
                                    </button>
                                </h3>
                                <p className="text-sm text-slate-400 mt-1 leading-relaxed">
                                    Pera or Lute lost connection. Please reconnect your wallet.
                                </p>
                                <button
                                    onClick={() => window.location.reload()}
                                    className="mt-4 w-full bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors"
                                >
                                    Reconnect
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </>
        );
    }
}
