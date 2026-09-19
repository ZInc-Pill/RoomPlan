import React from 'react';

export class PreviewBoundary extends React.Component<{ children: React.ReactNode; onReturn: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (!this.state.failed) return this.props.children;
    return <div role="alert" className="max-w-sm p-6 text-center text-slate-700">
      <p className="font-semibold">The 3D preview could not open.</p>
      <p className="mt-2 text-sm">Your plan is still available in 2D. If this continues, save your project and reload.</p>
      <button onClick={this.props.onReturn} className="mt-4 min-h-11 rounded-xl bg-indigo-600 px-4 text-white">Return to 2D</button>
    </div>;
  }
}
