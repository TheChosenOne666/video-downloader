import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import Header from '../components/Header';
import SEO from '../components/SEO';
import { seoConfig } from '../config/seo';
import { 
  getMembershipPlans, 
  getMySubscription,
  type MembershipPlan as Plan,
  type Subscription
} from '../services/membership';

export default function PricingPage() {
  console.log('[PricingPage] Component rendering');
  
  const navigate = useNavigate();
  const { setPage } = useApp();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [plansData, subData] = await Promise.all([
          getMembershipPlans(),
          getMySubscription().catch(() => null)
        ]);
        setPlans(plansData.filter(p => p.id !== 'free'));
        setSubscription(subData);
      } catch (err) {
        setError(err instanceof Error ? err.message : '加载失败');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const handlePurchase = (planId: string) => {
    navigate(`/payment?plan=${planId}`);
  };

  const formatPrice = (cents: number) => {
    return `¥${(cents / 100).toFixed(0)}`;
  };

  const getPlanBadge = (plan: Plan) => {
    if (plan.id === 'yearly') return '最受欢迎';
    if (plan.id === 'lifetime') return '超值';
    return null;
  };

  const isCurrentPlan = (planId: string) => {
    return subscription?.plan_id === planId;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <SEO config={seoConfig['/pricing']} />
      <Header />
      
      <main className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-slate-800 dark:text-white mb-4">
            选择适合您的套餐
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
            升级VIP会员，享受无限下载、AI视频总结等高级功能
          </p>
          
          {subscription && subscription.plan_id !== 'free' && (
            <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>
                当前套餐：{subscription.plan_name}
                {subscription.is_lifetime ? '（终身）' : subscription.expires_at ? `（有效期至 ${new Date(subscription.expires_at).toLocaleDateString()}）` : ''}
              </span>
            </div>
          )}
        </div>

        {error && (
          <div className="max-w-md mx-auto mb-8 p-4 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg text-center">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : plans.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-500 dark:text-slate-400">暂无可用套餐</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`relative rounded-2xl p-8 transition-all duration-300 ${
                  isCurrentPlan(plan.id)
                    ? 'bg-gradient-to-br from-green-500 to-green-600 text-white shadow-xl scale-105'
                    : plan.id === 'yearly'
                    ? 'bg-white dark:bg-slate-800 shadow-xl border-2 border-blue-500 scale-105'
                    : 'bg-white dark:bg-slate-800 shadow-lg hover:shadow-xl'
                }`}
              >
                {getPlanBadge(plan) && !isCurrentPlan(plan.id) && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-orange-500 to-red-500 text-white text-sm font-medium rounded-full">
                    {getPlanBadge(plan)}
                  </div>
                )}
                
                {isCurrentPlan(plan.id) && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-white text-green-600 text-sm font-medium rounded-full shadow">
                    当前套餐
                  </div>
                )}

                <h3 className={`text-2xl font-bold mb-2 ${
                  isCurrentPlan(plan.id) ? 'text-white' : 'text-slate-800 dark:text-white'
                }`}>
                  {plan.name}
                </h3>
                
                <p className={`text-sm mb-6 ${
                  isCurrentPlan(plan.id) ? 'text-green-100' : 'text-slate-500 dark:text-slate-400'
                }`}>
                  {plan.description}
                </p>

                <div className="mb-6">
                  <span className={`text-4xl font-bold ${
                    isCurrentPlan(plan.id) ? 'text-white' : 'text-slate-800 dark:text-white'
                  }`}>
                    {formatPrice(plan.price_cents)}
                  </span>
                  <span className={`text-sm ${
                    isCurrentPlan(plan.id) ? 'text-green-100' : 'text-slate-500 dark:text-slate-400'
                  }`}>
                    /{plan.duration_text}
                  </span>
                </div>

                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <svg className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
                        isCurrentPlan(plan.id) ? 'text-green-200' : 'text-green-500'
                      }`} fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span className={isCurrentPlan(plan.id) ? 'text-green-50' : 'text-slate-600 dark:text-slate-300'}>
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handlePurchase(plan.id)}
                  disabled={isCurrentPlan(plan.id) || (subscription && subscription.plan_id !== 'free')}
                  className={`w-full py-3 px-6 rounded-xl font-semibold transition-all ${
                    isCurrentPlan(plan.id)
                      ? 'bg-white/20 text-white cursor-default'
                      : (subscription && subscription.plan_id !== 'free')
                      ? 'bg-slate-300 dark:bg-slate-700 text-slate-500 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl'
                  }`}
                >
                  {isCurrentPlan(plan.id) ? (
                    '当前套餐'
                  ) : (subscription && subscription.plan_id !== 'free') ? (
                    '已有会员'
                  ) : (
                    '立即购买'
                  )}
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="text-center mt-12">
          <button
            onClick={() => setPage('home')}
            className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
          >
            ← 返回首页
          </button>
        </div>
      </main>
    </div>
  );
}
