import React from 'react';
import { RefreshCw, WifiOff } from 'lucide-react';

interface ChunkErrorBoundaryState {
  hasError: boolean;
}

export class ChunkErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ChunkErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ChunkErrorBoundaryState {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="my-12 mx-4 p-6 rounded-3xl bg-white border border-slate-200 text-center space-y-3 shadow-sm animate-fadeIn">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 mx-auto flex items-center justify-center">
            <WifiOff className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-extrabold text-slate-900">
            화면을 불러오는 중 일시적인 연결 문제가 발생했습니다
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            앱 업데이트 직후이거나 네트워크 전환 중일 수 있습니다. 아래 버튼을 눌러 다시 불러와 주세요.
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false });
              window.location.reload();
            }}
            className="px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs inline-flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            화면 새로고침
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

