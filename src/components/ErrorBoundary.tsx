import React from 'react';
import { RefreshCw, AlertTriangle } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error.message || 'একটি অপ্রত্যাশিত ত্রুটি ঘটেছে।',
    };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Sobdosuddhi ErrorBoundary caught:', error, info);
  }

  handleReload = () => {
    this.setState({ hasError: false, errorMessage: '' });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      let friendlyMsg = 'দুঃখিত, অ্যাপ্লিকেশনটি চালানোর সময় একটি সমস্যা দেখা দিয়েছে।';
      if (this.state.errorMessage.includes('Missing or insufficient permissions')) {
        friendlyMsg =
          'তথ্য সংরক্ষণের অনুমতিতে সমস্যা দেখা দিয়েছে। অনুগ্রহ করে নিশ্চিত করুন যে আপনার ইমেইল যাচাই করা আছে এবং পুনরায় চেষ্টা করুন।';
      } else if (this.state.errorMessage.includes('Quota exceeded')) {
        friendlyMsg = 'আজকের ডাটাবেস ব্যবহারের সীমা পূর্ণ হয়েছে। আগামীকাল আবার চেষ্টা করুন।';
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-[#F8F7F4] dark:bg-[#111513] px-6 py-12">
          <div className="max-w-md w-full bg-white dark:bg-[#181D1A] border border-[#E5E2DA] dark:border-[#2A322D] rounded-xl p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 flex items-center justify-center mx-auto mb-5">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h1 className="font-literary text-xl font-semibold text-[#1F2421] dark:text-[#ECEBE6] mb-3">
              সাময়িক ত্রুটি দেখা দিয়েছে
            </h1>
            <p className="text-sm text-[#5A635D] dark:text-[#9BA69F] leading-relaxed mb-6">
              {friendlyMsg}
            </p>
            <button
              type="button"
              onClick={this.handleReload}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-[#1E4D3B] hover:bg-[#163B2D] text-white text-sm font-medium transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              <span>পুনরায় লোড করুন</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
