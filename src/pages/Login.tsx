import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Eye,
  EyeOff,
  LogIn,
  Zap,
  BarChart3,
  Users,
  Shield,
  AlertCircle,
} from 'lucide-react'
import { supabase } from '../services/supabase'
import toast from 'react-hot-toast'

export default function Login() {
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Check if already logged in
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        const { data: profile } = await supabase
          .from('users')
          .select('role')
          .eq('auth_user_id', session.user.id)
          .single()

        if (profile) {
          redirectBasedOnRole(profile.role)
        }
      }
    }
    checkSession()
  }, [])

  const redirectBasedOnRole = (role) => {
    console.log('🔍 Redirecting with role:', role)
    
    if (!role) {
      console.error('❌ Role is null or undefined')
      toast.error('No role assigned. Contact Administrator.')
      return
    }

    const normalizedRole = role.toUpperCase()
    console.log('📌 Normalized role:', normalizedRole)

    switch (normalizedRole) {
      case 'SUPER_ADMIN':
        navigate('/dashboard', { replace: true })
        break
      case 'AREA_ADMIN':
        navigate('/areadashboard', { replace: true })
        break
      case 'COORDINATOR':
        navigate('/coordinator', { replace: true })
        break
      default:
        console.error('❌ Unknown role:', role)
        toast.error(`Unknown role: ${role}. Please contact support.`)
        supabase.auth.signOut()
        break
    }
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      console.log('🔐 Attempting login for:', email)

      // 1. Sign in with Supabase
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) {
        console.error('❌ Auth error:', authError)
        if (authError.message.includes('Invalid login credentials')) {
          throw new Error('Incorrect email or password. Please try again.')
        }
        if (authError.message.includes('Email not confirmed')) {
          throw new Error('Please verify your email address.')
        }
        throw new Error(authError.message)
      }

      console.log('✅ Auth successful for user:', data.user.id)

      // 2. Fetch user profile
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('auth_user_id', data.user.id)
        .single()

      if (profileError) {
        console.error('❌ Profile fetch error:', profileError)
        await supabase.auth.signOut()
        throw new Error('No profile found. Contact Administrator.')
      }

      console.log('📋 Profile found:', profile)
      console.log('👤 Role from database:', profile.role)

      // 3. Check user status
      if (profile.status !== 'ACTIVE') {
        console.error('❌ Account not active:', profile.status)
        await supabase.auth.signOut()
        throw new Error('Your account has been disabled.')
      }

      // 4. Check if role exists
      if (!profile.role) {
        console.error('❌ Role is null for user:', profile)
        await supabase.auth.signOut()
        throw new Error('No role assigned. Contact Administrator.')
      }

      // 5. Redirect based on role
      toast.success(`Welcome back, ${profile.name || 'User'}!`)
      redirectBasedOnRole(profile.role)

    } catch (err) {
      console.error('❌ Login error:', err)
      const message = err.message || 'Login failed. Please try again.'
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  // Fill with your actual test credentials
  const fillDemoCredentials = () => {
    setEmail('superadmin@dmcfs.in')
    setPassword('dmcfs123')
    setError('')
    toast.success('Demo credentials filled')
  }

  // Version info
  const version = import.meta.env.VITE_APP_VERSION || '1.0.0'
  const environment = import.meta.env.MODE || 'development'

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-3/5 bg-gradient-to-br from-blue-600 to-indigo-700 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-10"></div>
        <div className="relative z-10 flex flex-col justify-between p-12 text-white">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
                <span className="text-2xl font-bold">RT</span>
              </div>
              <div>
                <span className="text-2xl font-semibold tracking-tight">RTHC</span>
                <p className="text-xs text-blue-200/80 font-light">Real Time Head Count</p>
              </div>
            </div>
            <h1 className="mt-8 text-4xl font-bold leading-tight">
              Real Time Head Count
            </h1>
            <p className="mt-4 text-lg text-blue-100 max-w-md">
              Enterprise workforce management &amp; live monitoring dashboard.
            </p>
          </div>

          <div className="space-y-6">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 p-1.5 rounded-full bg-green-400/20">
                <Zap className="w-5 h-5 text-green-300" />
              </div>
              <div>
                <h3 className="font-medium">Live Head Count</h3>
                <p className="text-sm text-blue-100">Instant updates from every location</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="mt-0.5 p-1.5 rounded-full bg-blue-400/20">
                <BarChart3 className="w-5 h-5 text-blue-300" />
              </div>
              <div>
                <h3 className="font-medium">Real‑Time Analytics</h3>
                <p className="text-sm text-blue-100">Visual insights with drill‑down</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="mt-0.5 p-1.5 rounded-full bg-indigo-400/20">
                <Users className="w-5 h-5 text-indigo-300" />
              </div>
              <div>
                <h3 className="font-medium">Coordinator Workflow</h3>
                <p className="text-sm text-blue-100">Streamlined updates &amp; remarks</p>
              </div>
            </div>
          </div>

          <div className="text-sm text-blue-200/70 border-t border-white/10 pt-6">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              <span>Secure • Enterprise‑grade</span>
            </div>
            <p className="mt-1">© {new Date().getFullYear()} RTHC. All rights reserved.</p>
          </div>
        </div>
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-white/5 rounded-full blur-2xl"></div>
        <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-white/5 rounded-full blur-2xl"></div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-10">
        <div className="w-full max-w-md space-y-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Welcome Back</h2>
            <p className="mt-2 text-sm text-gray-600">
              Sign in to continue to the RTHC dashboard.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-3 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed"
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="relative mt-1">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full rounded-lg border border-gray-300 px-4 py-3 pr-10 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 transition"
                  disabled={loading}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                  disabled={loading}
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                  Remember me
                </label>
              </div>
              <div className="text-sm">
                <button
                  type="button"
                  className="font-medium text-blue-600 hover:text-blue-500 transition"
                  onClick={() => toast.info('Password reset feature coming soon')}
                >
                  Forgot password?
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700 border border-red-200">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !email || !password}
              className="flex w-full items-center justify-center rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Checking credentials...
                </>
              ) : (
                <>
                  <LogIn className="mr-2 h-4 w-4" />
                  Sign In
                </>
              )}
            </button>
          </form>

          <div className="text-center text-xs text-gray-500 flex flex-wrap justify-center gap-3 pt-4 border-t border-gray-200">
            <span>Version {version}</span>
            <span className="text-gray-300">•</span>
            <span className="text-gray-300">•</span>
            <span>RTHC Enterprise</span>
          </div>
        </div>
      </div>
    </div>
  )
}