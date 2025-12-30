import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-screen bg-slate-50 text-slate-800 p-6 text-center">
          <div className="bg-white p-8 rounded-xl shadow-lg max-w-lg border border-slate-200">
            <div className="flex justify-center mb-4">
                <div className="p-3 bg-rose-100 rounded-full text-rose-600">
                    <AlertTriangle size={32} />
                </div>
            </div>
            <h1 className="text-2xl font-bold mb-2">Algo deu errado</h1>
            <p className="text-slate-500 mb-6">O sistema encontrou um erro inesperado.</p>
            
            <div className="bg-slate-900 text-slate-200 p-4 rounded-lg text-left text-xs font-mono mb-6 overflow-auto max-h-40">
                {this.state.error?.message || "Erro desconhecido"}
            </div>

            <button
              onClick={() => window.location.reload()}
              className="flex items-center justify-center w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-bold"
            >
              <RefreshCw size={18} className="mr-2" />
              Recarregar Aplicação
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
