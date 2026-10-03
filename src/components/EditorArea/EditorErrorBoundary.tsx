import { Component, type ErrorInfo, type ReactNode } from 'react';

export class EditorErrorBoundary extends Component<{
  children: ReactNode;
  onRetry: () => void;
}, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() { return { failed: true }; }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Editor loading failed:', error, info.componentStack);
  }

  render() {
    return this.state.failed ? <div className="editor-loading" role="alert">
      编辑器加载失败 <button onClick={this.props.onRetry}>重新加载</button>
    </div> : this.props.children;
  }
}
