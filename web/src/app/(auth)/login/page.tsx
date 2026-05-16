'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { Phone, ArrowRight, Shield } from 'lucide-react'
import { authApi, userApi } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'

type Step = 'phone' | 'otp'

export default function LoginPage() {
  const router = useRouter()
  const { setTokens, setUser } = useAuthStore()
  const [step, setStep] = useState<Step>('phone')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSendOtp = async () => {
    if (!phone.match(/^(\+84|0)[0-9]{9}$/)) {
      toast.error('Số điện thoại không hợp lệ')
      return
    }
    setLoading(true)
    try {
      await authApi.sendOtp(phone)
      toast.success('OTP đã được gửi')
      setStep('otp')
    } catch (e: unknown) {
      toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Gửi OTP thất bại')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) { toast.error('OTP phải có 6 chữ số'); return }
    setLoading(true)
    try {
      const { data } = await authApi.verifyOtp(phone, otp)
      setTokens(data.accessToken, data.refreshToken)
      const { data: user } = await userApi.getProfile()
      setUser(user)
      router.replace('/chat')
    } catch (e: unknown) {
      toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'OTP không đúng')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gold mb-4">
            <span className="text-3xl font-black text-bg-primary">N</span>
          </div>
          <h1 className="text-2xl font-bold text-text-primary">NextTalk</h1>
          <p className="text-text-secondary text-sm mt-1">Nhắn tin · Gọi video · Chia sẻ</p>
        </div>

        <div className="bg-bg-secondary border border-border rounded-2xl p-6 space-y-5">
          {step === 'phone' ? (
            <>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">Số điện thoại</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendOtp()}
                    placeholder="0912 345 678"
                    className="input-field pl-10"
                    autoFocus
                  />
                </div>
              </div>
              <button onClick={handleSendOtp} disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
                {loading ? <span className="animate-spin w-4 h-4 border-2 border-bg-primary/40 border-t-bg-primary rounded-full" /> : <>Gửi mã OTP <ArrowRight className="w-4 h-4" /></>}
              </button>
            </>
          ) : (
            <>
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <button onClick={() => setStep('phone')} className="text-text-muted hover:text-text-primary transition-colors text-sm">← {phone}</button>
                </div>
                <label className="block text-sm font-medium text-text-secondary mb-2">Nhập mã OTP</label>
                <div className="relative">
                  <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    onKeyDown={(e) => e.key === 'Enter' && handleVerifyOtp()}
                    placeholder="6 chữ số"
                    className="input-field pl-10 text-center text-xl tracking-[0.5em] font-mono"
                    autoFocus
                  />
                </div>
                <p className="text-text-muted text-xs mt-2 text-center">Mã OTP có hiệu lực trong 2 phút</p>
              </div>
              <button onClick={handleVerifyOtp} disabled={loading || otp.length !== 6} className="btn-primary w-full flex items-center justify-center gap-2">
                {loading ? <span className="animate-spin w-4 h-4 border-2 border-bg-primary/40 border-t-bg-primary rounded-full" /> : 'Xác nhận'}
              </button>
              <button onClick={handleSendOtp} disabled={loading} className="btn-ghost w-full text-sm">Gửi lại OTP</button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
