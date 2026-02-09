'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    this.props.onError?.(error, errorInfo)
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  private handleReload = () => {
    window.location.reload()
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <Card className="border-red-200 bg-red-50 m-4">
          <CardContent className="p-6">
            <div 
              className="flex flex-col items-center text-center space-y-4"
              role="alert"
              aria-live="assertive"
            >
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-red-600" aria-hidden="true" />
              </div>
              
              <div className="space-y-2">
                <h2 className="text-lg font-semibold text-red-900">
                  Something went wrong
                </h2>
                <p className="text-sm text-red-700 max-w-md">
                  We encountered an unexpected error. You can try refreshing the page or going back.
                </p>
                {process.env.NODE_ENV === 'development' && this.state.error && (
                  <details className="text-left mt-4 p-3 bg-red-100 rounded-lg text-xs">
                    <summary className="cursor-pointer text-red-800 font-medium">
                      Error Details (dev only)
                    </summary>
                    <pre className="mt-2 overflow-auto text-red-900 whitespace-pre-wrap">
                      {this.state.error.message}
                      {'\n\n'}
                      {this.state.error.stack}
                    </pre>
                  </details>
                )}
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={this.handleReset}
                  className="border-red-300 text-red-700 hover:bg-red-100"
                  aria-label="Try again without refreshing"
                >
                  Try Again
                </Button>
                <Button
                  onClick={this.handleReload}
                  className="bg-red-600 hover:bg-red-700 text-white"
                  aria-label="Refresh the entire page"
                >
                  <RefreshCw className="h-4 w-4 mr-2" aria-hidden="true" />
                  Refresh Page
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )
    }

    return this.props.children
  }
}

// Functional wrapper for easier use
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  fallback?: ReactNode
) {
  return function WithErrorBoundary(props: P) {
    return (
      <ErrorBoundary fallback={fallback}>
        <WrappedComponent {...props} />
      </ErrorBoundary>
    )
  }
}

export default ErrorBoundary
