
import React, { useState, useEffect } from 'react';
import { 
  Trophy, 
  Users, 
  TrendingUp, 
  ShieldCheck, 
  Settings,
  Search,
  Bell,
  Globe,
  Star,
  UserCheck,
  Key,
  Share2,
  X
} from 'lucide-react';
import { Participant, EntryStatus, InvestmentOption, Announcement, Language } from './types';
import { INITIAL_INVESTMENT_TIERS, TRANSLATIONS } from './constants';
import AdminDashboard from './components/AdminDashboard';
import RegistrationForm from './components/RegistrationForm';
import StatusChecker from './components/StatusChecker';
import ResultPortal from './components/ResultPortal';
import LuckyDraw from './components/LuckyDraw';

const App: React.FC = () => {
  const [lang, setLang] = useState<Language>('ur');
  const [activeTab, setActiveTab] = useState<'home' | 'status' | 'admin' | 'result' | 'lucky-draw'>('home');
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [luckyDrawTier, setLuckyDrawTier] = useState<InvestmentOption | null>(null);
  const [tiers, setTiers] = useState<InvestmentOption[]>(INITIAL_INVESTMENT_TIERS);
  const [deletedTier, setDeletedTier] = useState<{ tier: InvestmentOption, index: number } | null>(null);
  const [showUndo, setShowUndo] = useState(false);
  const [selectedTier, setSelectedTier] = useState<InvestmentOption | null>(null);
  const [marqueeSpeed, setMarqueeSpeed] = useState<number>(25); 
  const [marqueePaused, setMarqueePaused] = useState<boolean>(false);
  const [selectedWinner, setSelectedWinner] = useState<Participant | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([
    {
      id: '1',
      text: 'اگلی بڑی قرعہ اندازی 15 رمضان کو لائیو ہوگی! ابھی شامل ہوں اور اپنی قسمت بدلیں۔',
      textEn: 'Next big draw will be live on 15th Ramadan! Join now and change your luck.',
      active: true
    }
  ]);

  const t = TRANSLATIONS[lang];

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/data');
        if (response.ok) {
          const data = await response.json();
          if (data.participants.length > 0) setParticipants(data.participants);
          if (data.tiers.length > 0) setTiers(data.tiers);
          if (data.announcements.length > 0) setAnnouncements(data.announcements);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };
    fetchData();

    const savedLang = localStorage.getItem('luckwin_lang');
    if (savedLang) setLang(savedLang as Language);

    const savedSpeed = localStorage.getItem('luckwin_speed');
    if (savedSpeed) setMarqueeSpeed(Number(savedSpeed));

    const savedPaused = localStorage.getItem('luckwin_paused');
    if (savedPaused) setMarqueePaused(savedPaused === 'true');

    // Enable No Password Login by default for the first time
    if (localStorage.getItem('showNoPassLogin') === null) {
      localStorage.setItem('showNoPassLogin', 'true');
    }
  }, []);

  useEffect(() => {
    const saveData = async () => {
      try {
        await fetch('/api/tiers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(tiers)
        });
        await fetch('/api/announcements', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(announcements)
        });
      } catch (error) {
        console.error('Error saving data:', error);
      }
    };
    if (tiers.length > 0 || announcements.length > 0) {
      saveData();
    }
    
    localStorage.setItem('luckwin_lang', lang);
    localStorage.setItem('luckwin_speed', marqueeSpeed.toString());
    localStorage.setItem('luckwin_paused', marqueePaused.toString());
  }, [tiers, announcements, lang, marqueeSpeed, marqueePaused]);

  const handleRegister = async (newParticipant: Participant) => {
    const existingUser = participants.find(p => p.phone === newParticipant.phone && p.name === newParticipant.name);
    const secretToken = existingUser?.secretToken || Math.random().toString(36).substring(2, 7).toUpperCase();
    
    const participantWithToken = { ...newParticipant, secretToken };
    
    try {
      const response = await fetch('/api/participants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(participantWithToken)
      });
      if (response.ok) {
        setParticipants(prev => [participantWithToken, ...prev]);
      }
    } catch (error) {
      console.error('Error registering:', error);
    }
    setSelectedTier(null);
  };

  const updateParticipantTID = async (id: string, trackingId: string) => {
    try {
      const status = EntryStatus.PENDING;
      await fetch('/api/participants/tid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, trackingId, status })
      });
      setParticipants(prev => prev.map(p => p.id === id ? { ...p, trackingId, status } : p));
    } catch (error) {
      console.error('Error updating TID:', error);
    }
  };

  const updateParticipantStatus = async (id: string, status: EntryStatus) => {
    try {
      await fetch('/api/participants/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status })
      });
      setParticipants(prev => prev.map(p => p.id === id ? { ...p, status } : p));
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const deleteTierWithUndo = (id: string) => {
    const index = tiers.findIndex(t => t.id === id);
    if (index !== -1) {
      const tier = tiers[index];
      setDeletedTier({ tier, index });
      setTiers(prev => prev.filter(t => t.id !== id));
      setShowUndo(true);
      setTimeout(() => {
        setShowUndo(false);
        setDeletedTier(null);
      }, 10000);
    }
  };

  const undoDelete = () => {
    if (deletedTier) {
      setTiers(prev => {
        const newTiers = [...prev];
        newTiers.splice(deletedTier.index, 0, deletedTier.tier);
        return newTiers;
      });
      setShowUndo(false);
      setDeletedTier(null);
    }
  };

  const handleSaveWinner = async (participantId: string, winAmount: number) => {
    const winningDate = Date.now();
    try {
      await fetch('/api/participants/winner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: participantId, winAmount, winningDate })
      });
      setParticipants(prev => prev.map(p => p.id === participantId ? { ...p, isWinner: true, winAmount, winningDate } : p));
      
      const winner = participants.find(p => p.id === participantId);
      if (winner) {
        setTiers(prev => prev.map(t => t.id === winner.categoryId ? { ...t, drawCompleted: true } : t));
      }
    } catch (error) {
      console.error('Error saving winner:', error);
    }
  };

  const toggleLanguage = () => setLang(l => l === 'ur' ? 'en' : 'ur');

  const marqueeText = announcements
    .filter(a => a.active)
    .map(a => lang === 'ur' ? a.text : a.textEn)
    .join('  |  ');

  return (
    <div className={`min-h-screen bg-gray-50 flex flex-col ${lang === 'ur' ? 'rtl font-urdu' : 'ltr font-sans'}`} dir={lang === 'ur' ? 'rtl' : 'ltr'}>
      <header className="bg-white border-b sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setActiveTab('home')}>
            <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center text-white shadow-lg rotate-3">
              <Trophy className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-black text-gray-900 nastaliq tracking-tighter">LUCK WIN</h1>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={toggleLanguage} className="flex items-center gap-1.5 bg-gray-100 px-3 py-1.5 rounded-full text-[10px] font-black text-gray-700 hover:bg-green-50 transition-colors">
              <Globe className="w-3 h-3" /> {lang === 'ur' ? 'English' : 'اردو'}
            </button>
            <button onClick={() => setActiveTab('admin')} className="p-2.5 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors">
              <Settings className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-grow max-w-7xl mx-auto w-full px-2 md:px-4 py-4 md:py-6">
        {activeTab === 'home' && (
          <div className="space-y-6 md:space-y-8">
            {marqueeText && (
              <div className="overflow-hidden bg-gradient-to-r from-yellow-500 to-orange-500 p-0.5 rounded-xl shadow-md">
                <div className="bg-yellow-50 px-4 py-2.5 rounded-[10px] flex items-center gap-3">
                  <Bell className="w-5 h-5 text-yellow-600 shrink-0 animate-bounce" />
                  <div className="flex-grow overflow-hidden relative h-6">
                     <p 
                        className={`absolute whitespace-nowrap text-sm font-black text-yellow-900 ${marqueePaused ? '' : 'animate-marquee'}`}
                        style={{ 
                          animationDuration: `${marqueeSpeed}s`,
                          right: marqueePaused ? '0' : 'auto'
                        }}
                      >
                       {marqueeText}
                     </p>
                  </div>
                </div>
              </div>
            )}

            <div className="text-center space-y-4 animate-in fade-in duration-1000">
              <h2 className="text-2xl md:text-5xl font-black text-gray-900 nastaliq leading-snug">
                {lang === 'ur' ? 'اپنی قسمت بدلنے کا وقت آ گیا ہے!' : 'Time to change your luck!'}
              </h2>
              <p className="text-[10px] md:text-lg text-gray-500 font-bold uppercase tracking-widest">{t.heroSub}</p>
              
              <div className="flex flex-col md:flex-row justify-center gap-3 pt-2">
                <button 
                  onClick={() => setActiveTab('status')}
                  className="flex items-center justify-center gap-2 px-8 py-3 bg-white border-2 border-green-600 text-green-700 rounded-full font-black text-sm shadow-xl shadow-green-100 hover:bg-green-50 active:scale-95 transition-all group"
                >
                  <UserCheck className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  {lang === 'ur' ? 'اپنا اسٹیٹس چیک کریں' : 'Check Your Status'}
                </button>
                <button 
                  onClick={() => setActiveTab('result')}
                  className="flex items-center justify-center gap-2 px-8 py-3 bg-green-600 text-white rounded-full font-black text-sm shadow-xl shadow-green-200 hover:bg-green-700 active:scale-95 transition-all group"
                >
                  <Trophy className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                  {t.viewResults}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 md:gap-8">
              {tiers.filter(t => !t.isExpired).map((tier, index) => {
                const tierParticipants = participants.filter(p => p.categoryId === tier.id && p.status === EntryStatus.APPROVED);
                const currentCount = tierParticipants.length + tier.currentMembers;
                const progress = Math.min((currentCount / tier.membersNeeded) * 100, 100);
                const isExample = index === 0; // First one as example
                const cardColor = tier.color || (isExample ? 'from-yellow-600 to-yellow-800' : 'from-green-600 to-green-900');

                return (
                  <div key={tier.id} className={`bg-white rounded-[20px] md:rounded-[30px] shadow-xl overflow-hidden border-2 flex flex-col transition-all duration-300 transform hover:-translate-y-2 group relative ${isExample ? 'border-yellow-400' : 'border-gray-100'}`}>
                    {isExample && (
                      <div className="absolute top-4 -right-8 bg-yellow-400 text-yellow-900 text-[8px] font-black py-1 px-10 rotate-45 z-10 shadow-sm uppercase tracking-tighter">
                        {lang === 'ur' ? 'مثال (Example)' : 'Example Card'}
                      </div>
                    )}
                    <div 
                      className={`p-3 md:p-6 text-white text-center ${cardColor.startsWith('#') ? '' : `bg-gradient-to-br ${cardColor}`}`}
                      style={cardColor.startsWith('#') ? { background: `linear-gradient(135deg, ${cardColor}, ${cardColor}dd)` } : {}}
                    >
                      <div className="text-[8px] opacity-70 font-black uppercase tracking-tighter">{t.investOnly}</div>
                      <div className="text-lg md:text-4xl font-black drop-shadow-lg">Rs. {tier.investAmount}</div>
                      <div className="h-px bg-white/20 my-2"></div>
                      <div className="text-[8px] opacity-70 font-black uppercase tracking-tighter">{t.winTotal}</div>
                      <div className="text-xl md:text-5xl font-black text-yellow-400 drop-shadow-xl scale-110">Rs. {tier.winAmount}</div>
                    </div>
                    <div className="p-3 md:p-6 space-y-3 flex-grow">
                      <div className="flex justify-between items-center text-[8px] font-black uppercase">
                        <div className="flex items-center gap-1 text-gray-400"><Users className="w-3 h-3" /> {currentCount} / {tier.membersNeeded}</div>
                        <div className="text-green-600 flex items-center gap-1"><Star className="w-3 h-3 fill-green-600" /> LIVE</div>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden border">
                        <div className={`h-full transition-all duration-1000 ${isExample ? 'bg-yellow-500' : 'bg-gradient-to-r from-green-400 to-green-600'}`} style={{ width: `${progress}%` }}></div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => setSelectedTier(tier)} className={`flex-grow py-3 text-white rounded-xl text-[10px] md:text-sm font-black shadow-xl active:scale-95 transition-all ${isExample ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-green-600 hover:bg-green-700'}`}>{t.joinNow}</button>
                        <button 
                          onClick={() => {
                            const text = `${t.heroTitle}\nInvest Rs. ${tier.investAmount} & Win Rs. ${tier.winAmount}!\nJoin here: ${window.location.href}`;
                            window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
                          }}
                          className="p-3 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition-all"
                        >
                          <Share2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* How It Works Section */}
            <div className="bg-white rounded-[40px] p-8 shadow-xl border border-gray-100 space-y-8">
              <div className="text-center space-y-2">
                <h3 className="text-3xl font-black text-gray-900 nastaliq">{t.howItWorksTitle}</h3>
                <div className="w-20 h-1.5 bg-green-600 mx-auto rounded-full"></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                  { icon: Search, title: t.step1Title, desc: t.step1Desc, color: 'bg-blue-50 text-blue-600' },
                  { icon: UserCheck, title: t.step2Title, desc: t.step2Desc, color: 'bg-green-50 text-green-600' },
                  { icon: Key, title: t.step3Title, desc: t.step3Desc, color: 'bg-yellow-50 text-yellow-600' },
                  { icon: Trophy, title: t.step4Title, desc: t.step4Desc, color: 'bg-orange-50 text-orange-600' }
                ].map((step, i) => (
                  <div key={i} className="flex flex-col items-center text-center space-y-3 p-4 rounded-3xl hover:bg-gray-50 transition-colors">
                    <div className={`w-14 h-14 ${step.color} rounded-2xl flex items-center justify-center shadow-sm`}>
                      <step.icon className="w-7 h-7" />
                    </div>
                    <h4 className="font-black text-gray-800 text-lg">{step.title}</h4>
                    <p className="text-xs text-gray-400 font-bold leading-relaxed">{step.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Winners Section */}
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <h3 className="text-3xl font-black text-gray-900 nastaliq">{t.winnersTitle}</h3>
                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">{t.winnersSub}</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {participants.filter(p => p.isWinner).sort((a, b) => (b.winningDate || 0) - (a.winningDate || 0)).slice(0, 6).map((winner, i) => (
                  <div 
                    key={winner.id} 
                    onClick={() => setSelectedWinner(winner)}
                    className="bg-gradient-to-br from-white to-gray-50 p-6 rounded-[32px] border border-gray-100 shadow-lg flex items-center gap-4 group hover:scale-[1.02] transition-all cursor-pointer"
                  >
                    <div className="w-16 h-16 bg-yellow-400 rounded-2xl flex items-center justify-center text-yellow-900 shadow-lg rotate-3 group-hover:rotate-0 transition-transform">
                      <Trophy className="w-8 h-8" />
                    </div>
                    <div>
                      <h4 className="font-black text-gray-900">{winner.name}</h4>
                      <div className="text-green-600 font-black text-xl">Rs. {winner.winAmount?.toLocaleString()}</div>
                      <div className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">
                        {new Date(winner.winningDate || 0).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })}
                      </div>
                    </div>
                  </div>
                ))}
                {participants.filter(p => p.isWinner).length === 0 && (
                  <div className="col-span-full p-10 bg-white rounded-[32px] border border-dashed text-center text-gray-400 font-bold italic">
                    {lang === 'ur' ? 'ابھی تک کوئی فاتح نہیں ہے۔ اگلا نمبر آپ کا ہو سکتا ہے!' : 'No winners yet. You could be next!'}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {selectedWinner && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white w-full max-w-md rounded-[40px] overflow-hidden shadow-2xl animate-in zoom-in duration-300 relative">
              <button onClick={() => setSelectedWinner(null)} className="absolute top-6 right-6 p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-all z-10">
                <X className="w-5 h-5 text-gray-600" />
              </button>
              
              <div className="bg-gradient-to-br from-yellow-400 to-orange-500 p-10 text-center text-white space-y-4">
                <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mx-auto shadow-inner">
                  <Trophy className="w-12 h-12 text-white animate-bounce" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-4xl font-black nastaliq leading-tight">{lang === 'ur' ? 'خوش نصیب فاتح' : 'Lucky Winner'}</h3>
                  <p className="text-xs font-bold uppercase tracking-[0.3em] opacity-80">Winner Profile</p>
                </div>
              </div>

              <div className="p-8 space-y-6">
                <div className="text-center space-y-1">
                  <h4 className="text-3xl font-black text-gray-900">{selectedWinner.name}</h4>
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">{selectedWinner.phone.replace(/(\d{4})\d{4}(\d{3})/, '$1****$2')}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-blue-50 p-4 rounded-3xl border border-blue-100 text-center">
                    <p className="text-[10px] text-blue-600 font-black uppercase">انویسٹمنٹ (Invested)</p>
                    <p className="text-xl font-black text-blue-800">Rs. {tiers.find(t => t.id === selectedWinner.categoryId)?.investAmount}</p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-3xl border border-green-100 text-center">
                    <p className="text-[10px] text-green-600 font-black uppercase">جیتا (Won)</p>
                    <p className="text-xl font-black text-green-800">Rs. {selectedWinner.winAmount?.toLocaleString()}</p>
                  </div>
                </div>

                <div className="space-y-3 pt-4 border-t">
                  <div className="flex justify-between items-center text-xs font-bold">
                    <span className="text-gray-400 uppercase">انویسٹمنٹ کی تاریخ</span>
                    <span className="text-gray-800">{new Date(selectedWinner.timestamp).toLocaleDateString('en-PK', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs font-bold">
                    <span className="text-gray-400 uppercase">جیتنے کی تاریخ</span>
                    <span className="text-gray-800">{new Date(selectedWinner.winningDate || 0).toLocaleDateString('en-PK', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                  </div>
                </div>

                <button 
                  onClick={() => setSelectedWinner(null)}
                  className="w-full py-5 bg-gray-900 text-white rounded-2xl font-black shadow-xl hover:bg-black transition-all uppercase tracking-widest text-sm"
                >
                  ماشاءاللہ
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'status' && (
          <StatusChecker 
            participants={participants} 
            tiers={tiers} 
            lang={lang} 
            onBack={() => setActiveTab('home')} 
            updateTID={updateParticipantTID}
          />
        )}
        {activeTab === 'result' && <ResultPortal participants={participants} tiers={tiers} lang={lang} onBack={() => setActiveTab('home')} />}
        {activeTab === 'lucky-draw' && luckyDrawTier && (
          <LuckyDraw 
            tier={luckyDrawTier} 
            participants={participants} 
            lang={lang} 
            onBack={() => {
              setActiveTab('admin');
              setLuckyDrawTier(null);
            }} 
            onSaveWinner={handleSaveWinner}
          />
        )}
        {activeTab === 'admin' && (
          <AdminDashboard 
            participants={participants} 
            updateStatus={updateParticipantStatus} 
            tiers={tiers} 
            setTiers={setTiers} 
            deleteTier={deleteTierWithUndo}
            announcements={announcements} 
            setAnnouncements={setAnnouncements}
            marqueeSpeed={marqueeSpeed}
            setMarqueeSpeed={setMarqueeSpeed}
            marqueePaused={marqueePaused}
            setMarqueePaused={setMarqueePaused}
            onBack={() => setActiveTab('home')}
            onStartDraw={(tier) => {
              setLuckyDrawTier(tier);
              setActiveTab('lucky-draw');
            }}
          />
        )}
      </main>

      {showUndo && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[60] animate-in slide-in-from-bottom-10">
          <div className="bg-gray-900 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-4">
            <span className="text-sm font-bold">Card removed.</span>
            <button onClick={undoDelete} className="text-yellow-400 font-black text-sm uppercase hover:underline">Undo</button>
          </div>
        </div>
      )}

      <footer className="md:hidden bg-white border-t sticky bottom-0 z-50 py-2 flex justify-around items-center">
        {[ 
          { id: 'home', icon: Trophy, label: t.home }, 
          { id: 'status', icon: Search, label: t.status }, 
          { id: 'result', icon: Star, label: lang === 'ur' ? 'رزلٹ' : 'Result' },
          { id: 'admin', icon: Settings, label: t.admin } 
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex flex-col items-center p-1.5 transition-all ${activeTab === tab.id ? 'text-green-600 scale-110' : 'text-gray-400'}`}>
            <tab.icon className="w-5 h-5" />
            <span className="text-[9px] mt-0.5 font-black uppercase tracking-tighter">{tab.label}</span>
          </button>
        ))}
      </footer>

      {selectedTier && (
        <RegistrationForm 
          tier={selectedTier} 
          onClose={() => setSelectedTier(null)} 
          onRegister={handleRegister} 
          lang={lang} 
          onToggleLang={toggleLanguage} 
          existingParticipants={participants} 
        />
      )}
      
      <style>{`
        @keyframes marquee { 0% { transform: translateX(100%); } 100% { transform: translateX(-100%); } }
        .animate-marquee { animation: marquee linear infinite; }
      `}</style>
    </div>
  );
};

export default App;
