import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import Header from '../components/Header';
import SEO from '../components/SEO';
import { seoConfig } from '../config/seo';
import { 
  getMembershipPlan, 
  createOrder, 
  mockPayOrder,
  getMySubscription,
  type MembershipPlan
} from '../services/membership';

export default function PaymentPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isLoggedIn } = useApp();
  
  const planId = searchParams.get('plan') || 'monthly';
  
  const [plan, setPlan] = useState<MembershipPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [orderId, setOrderId] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [payMethod, setPayMethod] = useState<'wechat' | 'alipay'>('wechat');

  useEffect(() => {
    if (!isLoggedIn) {
      navigate('/auth?redirect=/payment?plan=' + planId);
      return;
    }
    
    const loadPlan = async () => {
      try {
        const planData = await getMembershipPlan(planId);
        if (!planData) {
          setError('套餐不存在');
          return;
        }
        setPlan(planData);
      } catch (err) {
        setError(err instanceof Error ? err.message : '加载失败');
      } finally {
        setLoading(false);
      }
    };
    
    loadPlan();
  }, [planId, isLoggedIn, navigate]);

  const handlePayment = async () => {
    if (!plan || processing) return;
    
    try {
      setProcessing(true);
      setError('');
      
      // 创建订单
      const order = await createOrder(plan.id);
      setOrderId(order.id);
      
      // 模拟支付（传递支付方式）
      const paidOrder = await mockPayOrder(order.id, payMethod);
      
      if (paidOrder.status === 'paid') {
        setSuccess(true);
        // 更新订阅状态
        await getMySubscription();
        
        // 3秒后跳转到个人中心
        setTimeout(() => {
          navigate('/profile');
        }, 3000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '支付失败');
    } finally {
      setProcessing(false);
    }
  };

  const handleCancel = () => {
    navigate('/pricing');
  };

  const formatPrice = (cents: number) => {
    return `¥${(cents / 100).toFixed(2)}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
        <Header />
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
        <Header />
        <div className="container mx-auto px-4 py-20 text-center">
          <p className="text-red-500">{error || '套餐不存在'}</p>
          <button 
            onClick={() => navigate('/pricing')}
            className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            返回套餐页面
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <SEO config={seoConfig['/pricing']} />
      <Header />
      
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-lg mx-auto">
          {success ? (
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 text-center">
              <div className="w-20 h-20 mx-auto mb-6 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">
                支付成功！
              </h2>
              <p className="text-slate-600 dark:text-slate-400 mb-6">
                恭喜您成为 <span className="font-semibold text-blue-600">{plan.name}</span>
              </p>
              {orderId && (
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                  订单号：{orderId}
                </p>
              )}
              <p className="text-sm text-slate-400">
                即将跳转到个人中心...
              </p>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-6 text-center">
                确认订单
              </h1>
              
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl overflow-hidden">
                {/* 套餐信息 */}
                <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-slate-800 dark:text-white">
                        {plan.name}
                      </h3>
                      <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                        {plan.description}
                      </p>
                    </div>
                    <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-sm rounded-full">
                      {plan.duration_text}
                    </span>
                  </div>
                  
                  <div className="space-y-2">
                    {plan.features.map((feature, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                        <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        {feature}
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* 支付金额 */}
                <div className="p-6 bg-slate-50 dark:bg-slate-900/50">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-slate-600 dark:text-slate-400">套餐价格</span>
                    <span className="text-slate-800 dark:text-white">{formatPrice(plan.price_cents)}</span>
                  </div>
                  <div className="flex justify-between items-center text-lg font-bold">
                    <span className="text-slate-800 dark:text-white">应付金额</span>
                    <span className="text-blue-600 dark:text-blue-400">{formatPrice(plan.price_cents)}</span>
                  </div>
                </div>
                
                {/* 支付方式选择 */}
                <div className="p-6 border-t border-slate-200 dark:border-slate-700">
                  <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">选择支付方式</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setPayMethod('wechat')}
                      className={`flex items-center justify-center gap-3 p-4 rounded-xl border-2 transition-all ${
                        payMethod === 'wechat'
                          ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                      }`}
                    >
                      {/* 微信官方图标 - 来自 simple-icons */}
                      <svg className="w-7 h-7" role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path fill="#07C160" d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 0 0 .167-.054l1.903-1.114a.864.864 0 0 1 .717-.098 10.16 10.16 0 0 0 2.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178A1.17 1.17 0 0 1 4.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178 1.17 1.17 0 0 1-1.162-1.178c0-.651.52-1.18 1.162-1.18zm5.34 2.867c-1.797-.052-3.746.512-5.28 1.786-1.72 1.428-2.687 3.72-1.78 6.22.942 2.453 3.666 4.229 6.884 4.229.826 0 1.622-.12 2.361-.336a.722.722 0 0 1 .598.082l1.584.926a.272.272 0 0 0 .14.047c.134 0 .24-.111.24-.247 0-.06-.023-.12-.038-.177l-.327-1.233a.582.582 0 0 1-.023-.156.49.49 0 0 1 .201-.398C23.024 18.48 24 16.82 24 14.98c0-3.21-2.931-5.837-6.656-6.088V8.89c-.135-.01-.27-.027-.407-.03zm-2.53 3.274c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.97-.982zm4.844 0c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.969-.982z"/>
                      </svg>
                      <span className={`font-medium ${payMethod === 'wechat' ? 'text-green-600 dark:text-green-400' : 'text-slate-600 dark:text-slate-400'}`}>
                        微信支付
                      </span>
                      {payMethod === 'wechat' && (
                        <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => setPayMethod('alipay')}
                      className={`flex items-center justify-center gap-3 p-4 rounded-xl border-2 transition-all ${
                        payMethod === 'alipay'
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                      }`}
                    >
                      {/* 支付宝官方图标 - 来自 simple-icons */}
                      <svg className="w-7 h-7" role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path fill="#1677FF" d="M19.695 15.07c3.426 1.158 4.203 1.22 4.203 1.22V3.846c0-2.124-1.705-3.845-3.81-3.845H3.914C1.808.001.102 1.722.102 3.846v16.31c0 2.123 1.706 3.845 3.813 3.845h16.173c2.105 0 3.81-1.722 3.81-3.845v-.157s-6.19-2.602-9.315-4.119c-2.096 2.602-4.8 4.181-7.607 4.181-4.75 0-6.361-4.19-4.112-6.949.49-.602 1.324-1.175 2.617-1.497 2.025-.502 5.247.313 8.266 1.317a16.796 16.796 0 0 0 1.341-3.302H5.781v-.952h4.799V6.975H4.77v-.953h5.81V3.591s0-.409.411-.409h2.347v2.84h5.744v.951h-5.744v1.704h4.69a19.453 19.453 0 0 1-1.986 5.06c1.424.52 2.702 1.011 3.654 1.333m-13.81-2.032c-.596.06-1.71.325-2.321.869-1.83 1.608-.735 4.55 2.968 4.55 2.151 0 4.301-1.388 5.99-3.61-2.403-1.182-4.438-2.028-6.637-1.809"/>
                      </svg>
                      <span className={`font-medium ${payMethod === 'alipay' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-600 dark:text-slate-400'}`}>
                        支付宝
                      </span>
                      {payMethod === 'alipay' && (
                        <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
                
                {/* 错误提示 */}
                {error && (
                  <div className="px-6 py-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
                    {error}
                  </div>
                )}
                
                {/* 支付按钮 */}
                <div className="p-6 space-y-3">
                  <button
                    onClick={handlePayment}
                    disabled={processing}
                    className="w-full py-3 px-6 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl disabled:cursor-not-allowed"
                  >
                    {processing ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        处理中...
                      </span>
                    ) : (
                      '确认支付'
                    )}
                  </button>
                  <button
                    onClick={handleCancel}
                    disabled={processing}
                    className="w-full py-3 px-6 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-xl font-medium transition-all disabled:opacity-50"
                  >
                    取消
                  </button>
                </div>
              </div>
              
              <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-4">
                点击"确认支付"将使用模拟支付完成订单（仅用于测试）
              </p>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
