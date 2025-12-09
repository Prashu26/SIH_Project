import React from 'react';
import { Link } from 'react-router-dom';
import 'boxicons/css/boxicons.min.css';
import { useLanguage } from '../contexts/LanguageContext';

const Home = () => {
    const { t } = useLanguage();

    const features = [
        {
            icon: 'bx-shield-check',
            title: t('blockchainSecurity'),
            description: t('blockchainSecurityDesc'),
            color: 'from-blue-500 to-cyan-500'
        },
        {
            icon: 'bx-time',
            title: t('instantVerification'),
            description: t('instantVerificationDesc'),
            color: 'from-purple-500 to-pink-500'
        },
        {
            icon: 'bx-globe',
            title: t('globalRecognition'),
            description: t('globalRecognitionDesc'),
            color: 'from-green-500 to-teal-500'
        },
        {
            icon: 'bx-fingerprint',
            title: t('digitalIdentity'),
            description: t('digitalIdentityDesc'),
            color: 'from-orange-500 to-red-500'
        }
    ];

    const steps = [
        {
            step: '01',
            title: t('step1Title'),
            description: t('step1Desc'),
            icon: 'bx-user-plus'
        },
        {
            step: '02',
            title: t('step2Title'),
            description: t('step2Desc'),
            icon: 'bx-certificate'
        },
        {
            step: '03',
            title: t('step3Title'),
            description: t('step3Desc'),
            icon: 'bx-check-shield'
        }
    ];

    const testimonials = [
        {
            name: t('testimonial1Name'),
            role: t('testimonial1Role'),
            comment: t('testimonial1Comment'),
            avatar: 'S'
        },
        {
            name: t('testimonial2Name'),
            role: t('testimonial2Role'),
            comment: t('testimonial2Comment'),
            avatar: 'M'
        },
        {
            name: t('testimonial3Name'),
            role: t('testimonial3Role'),
            comment: t('testimonial3Comment'),
            avatar: 'E'
        }
    ];

    return (
        <div className="space-y-20">
            {/* Features Section (winter/stats style) */}
            <section className="container mx-auto px-6 py-20">
                <div className="relative rounded-2xl p-8 bg-gradient-to-r from-sky-900/10 via-indigo-900/8 to-slate-900/8 backdrop-blur-md border border-sky-200/8 overflow-hidden">
                    <div className="absolute -top-16 -left-16 w-72 h-72 bg-[radial-gradient(ellipse_at_top_left,rgba(255,255,255,0.04),transparent)] pointer-events-none rounded-2xl" />
                    <div className="absolute -bottom-20 -right-20 w-72 h-72 bg-[radial-gradient(ellipse_at_bottom_right,rgba(200,230,255,0.02),transparent)] pointer-events-none rounded-2xl" />

                    <div className="text-center mb-8 relative z-10">
                        <h2 className="text-4xl font-bold text-sky-100 mb-4">
                            {t('whyChoose')}
                        </h2>
                        <p className="text-lg text-sky-200/80 max-w-3xl mx-auto">
                            {t('whyChooseSubtitle')}
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 relative z-10">
                        {features.map((feature, index) => (
                            <div
                                key={index}
                                className="rounded-2xl p-6 bg-white/3 border border-white/6 backdrop-blur-sm flex flex-col items-center text-center"
                            >
                                <div className={`inline-flex items-center justify-center w-16 h-16 rounded-xl bg-gradient-to-r ${feature.color} mb-4 shadow-[0_8px_30px_rgba(99,102,241,0.06)]`}>
                                    <i className={`bx ${feature.icon} text-2xl text-white`}></i>
                                </div>
                                <h3 className="text-xl font-semibold text-sky-100 mb-2">{feature.title}</h3>
                                <p className="text-sky-200/80">{feature.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* How it Works (winter/stats style) */}
            <section className="container mx-auto px-6 py-20">
                <div className="relative rounded-2xl p-8 bg-gradient-to-r from-sky-900/10 via-indigo-900/8 to-slate-900/8 backdrop-blur-md border border-sky-200/8 overflow-hidden">
                    <div className="absolute -top-16 -left-16 w-72 h-72 bg-[radial-gradient(ellipse_at_top_left,rgba(255,255,255,0.04),transparent)] pointer-events-none rounded-2xl" />
                    <div className="absolute -bottom-20 -right-20 w-72 h-72 bg-[radial-gradient(ellipse_at_bottom_right,rgba(200,230,255,0.02),transparent)] pointer-events-none rounded-2xl" />

                    <div className="text-center mb-8 relative z-10">
                        <h2 className="text-4xl font-bold text-sky-100 mb-4">{t('howItWorks')}</h2>
                        <p className="text-lg text-sky-200/80 max-w-2xl mx-auto">{t('howItWorksSubtitle')}</p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8 relative z-10">
                        {steps.map((step, index) => (
                            <div key={index} className="rounded-2xl p-6 bg-white/3 border border-white/6 backdrop-blur-sm text-center">
                                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-r from-sky-300 to-indigo-300 mx-auto mb-4 shadow-[0_12px_40px_rgba(99,102,241,0.06)]">
                                    <i className={`bx ${step.icon} text-3xl text-white`}></i>
                                </div>
                                <div className="text-sky-200 font-bold mb-2">{t('step')} {step.step}</div>
                                <h3 className="text-2xl font-semibold text-sky-100 mb-2">{step.title}</h3>
                                <p className="text-sky-200/80">{step.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Quick Actions (winter/stats style) */}
            <section className="container mx-auto px-6 py-20">
                <div className="relative rounded-2xl p-8 bg-gradient-to-r from-sky-900/10 via-indigo-900/8 to-slate-900/8 backdrop-blur-md border border-sky-200/8 overflow-hidden">
                    <div className="absolute -top-16 -left-16 w-72 h-72 bg-[radial-gradient(ellipse_at_top_left,rgba(255,255,255,0.04),transparent)] pointer-events-none rounded-2xl" />
                    <div className="absolute -bottom-20 -right-20 w-72 h-72 bg-[radial-gradient(ellipse_at_bottom_right,rgba(200,230,255,0.02),transparent)] pointer-events-none rounded-2xl" />

                    <div className="text-center mb-8 relative z-10">
                        <h2 className="text-4xl font-bold text-sky-100 mb-4">{t('ctaTitle')}</h2>
                        <p className="text-lg text-sky-200/80 max-w-2xl mx-auto">{t('ctaSubtitle')}</p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8 relative z-10 max-w-4xl mx-auto">
                        <Link to="/register" className="rounded-2xl p-6 bg-white/3 border border-white/6 backdrop-blur-sm text-center flex flex-col items-center">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 mb-4 shadow-[0_8px_30px_rgba(99,102,241,0.06)]">
                                <i className="bx bx-user-plus text-2xl text-white"></i>
                            </div>
                            <h3 className="text-xl font-semibold text-sky-100 mb-2">{t('qaSignUp')}</h3>
                            <p className="text-sky-200/80">{t('qaSignUpDesc')}</p>
                        </Link>

                        <Link to="/verify" className="rounded-2xl p-6 bg-white/3 border border-white/6 backdrop-blur-sm text-center flex flex-col items-center">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-sky-400 to-indigo-400 mb-4 shadow-[0_8px_30px_rgba(99,102,241,0.06)]">
                                <i className="bx bx-search text-2xl text-white"></i>
                            </div>
                            <h3 className="text-xl font-semibold text-sky-100 mb-2">{t('qaVerify')}</h3>
                            <p className="text-sky-200/80">{t('qaVerifyDesc')}</p>
                        </Link>

                        <Link to="/features" className="rounded-2xl p-6 bg-white/3 border border-white/6 backdrop-blur-sm text-center flex flex-col items-center">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-purple-400 to-pink-400 mb-4 shadow-[0_8px_30px_rgba(99,102,241,0.06)]">
                                <i className="bx bx-star text-2xl text-white"></i>
                            </div>
                            <h3 className="text-xl font-semibold text-sky-100 mb-2">{t('qaExplore')}</h3>
                            <p className="text-sky-200/80">{t('qaExploreDesc')}</p>
                        </Link>
                    </div>
                </div>
            </section>

            {/* Testimonials -> winter-stats style */}
            <section className="container mx-auto px-6 py-20">
                <div className="relative rounded-2xl p-8 bg-gradient-to-r from-sky-900/10 via-indigo-900/8 to-slate-900/8 backdrop-blur-md border border-sky-200/8 overflow-hidden">
                    {/* frosted radial sheen (matches stats design) */}
                    <div className="absolute -top-16 -left-16 w-72 h-72 bg-[radial-gradient(ellipse_at_top_left,rgba(255,255,255,0.04),transparent)] pointer-events-none rounded-2xl" />
                    <div className="absolute -bottom-20 -right-20 w-72 h-72 bg-[radial-gradient(ellipse_at_bottom_right,rgba(200,230,255,0.02),transparent)] pointer-events-none rounded-2xl" />

                    <div className="grid md:grid-cols-3 gap-8 text-center relative z-10">
                        {testimonials.map((t, i) => (
                            <div
                                key={i}
                                className="rounded-2xl p-6 bg-white/2 border border-white/6 backdrop-blur-sm flex flex-col items-center text-center"
                            >
                                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-sky-300 to-indigo-300 mb-4 shadow-[0_8px_30px_rgba(99,102,241,0.06)]">
                                    <span className="text-white font-bold">{t.avatar}</span>
                                </div>

                                <h3 className="text-lg font-semibold text-sky-100 mb-1">{t.name}</h3>
                                <p className="text-sm text-sky-200/90 mb-3 capitalize">{t.role}</p>
                                <p className="text-sky-100/85 italic">"{t.comment}"</p>

                                <div className="flex items-center gap-1 mt-4 text-yellow-400">
                                    {[...Array(5)].map((_, idx) => (
                                        <i key={idx} className="bx bxs-star text-sm"></i>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Stats Section (winter vibe) */}
            <section className="container mx-auto px-6 py-20">
                <div className="relative rounded-2xl p-8 bg-gradient-to-r from-sky-900/10 via-indigo-900/8 to-slate-900/8 backdrop-blur-md border border-sky-200/8 overflow-hidden">
                    {/* subtle frosted radial sheen */}
                    <div className="absolute -top-16 -left-16 w-72 h-72 bg-[radial-gradient(ellipse_at_top_left,rgba(255,255,255,0.04),transparent)] pointer-events-none" />
                    <div className="absolute -bottom-20 -right-20 w-72 h-72 bg-[radial-gradient(ellipse_at_bottom_right,rgba(200,230,255,0.02),transparent)] pointer-events-none" />

                    <div className="grid md:grid-cols-4 gap-8 text-center relative z-10">
                        <div>
                            <div className="flex items-center justify-center gap-3 text-4xl font-bold text-sky-100 drop-shadow-md mb-2">
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-sky-200" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" /></svg>
                                <span>15,420+</span>
                            </div>
                            <p className="text-sky-200/80">{t('statsCertificatesIssued')}</p>
                        </div>

                        <div>
                            <div className="flex items-center justify-center gap-3 text-4xl font-bold text-indigo-100 drop-shadow-md mb-2">
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-indigo-200" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" /></svg>
                                <span>245+</span>
                            </div>
                            <p className="text-indigo-200/80">{t('statsPartnerInstitutions')}</p>
                        </div>

                        <div>
                            <div className="flex items-center justify-center gap-3 text-4xl font-bold text-cyan-100 drop-shadow-md mb-2">
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-cyan-200" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" /></svg>
                                <span>89,650+</span>
                            </div>
                            <p className="text-cyan-200/80">{t('statsVerificationsCompleted')}</p>
                        </div>

                        <div>
                            <div className="flex items-center justify-center gap-3 text-4xl font-bold text-teal-100 drop-shadow-md mb-2">
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-teal-200" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" /></svg>
                                <span>99.9%</span>
                            </div>
                            <p className="text-teal-200/80">{t('statsUptimeGuarantee')}</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section (winter vibe — matched to Stats container design) */}
            <section className="container mx-auto px-6 pb-20">
                <div className="relative rounded-2xl p-8 bg-gradient-to-r from-sky-900/10 via-indigo-900/8 to-slate-900/8 backdrop-blur-md border border-sky-200/8 overflow-hidden text-center">
                    {/* subtle frosted radial sheen */}
                    <div className="absolute -top-16 -left-16 w-72 h-72 bg-[radial-gradient(ellipse_at_top_left,rgba(255,255,255,0.04),transparent)] pointer-events-none rounded-2xl" />
                    <div className="absolute -bottom-20 -right-20 w-72 h-72 bg-[radial-gradient(ellipse_at_bottom_right,rgba(200,230,255,0.02),transparent)] pointer-events-none rounded-2xl" />

                    <div className="relative z-10 max-w-3xl mx-auto py-6">
                        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-tr from-sky-300/30 to-indigo-300/30 mb-6 shadow-[0_12px_40px_rgba(99,102,241,0.06)]">
                            <i className="bx bx-snowflake text-3xl text-white/90"></i>
                        </div>
                        <h2 className="text-4xl font-extrabold text-sky-100 mb-4">{t('ctaTitle')}</h2>
                        <p className="text-lg text-sky-200/80 mb-8 max-w-2xl mx-auto">
                            {t('ctaSubtitle')}
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <Link
                                to="/register"
                                className="inline-flex items-center justify-center bg-gradient-to-r from-sky-300 to-indigo-300 text-sky-900 px-8 py-4 rounded-lg font-bold hover:scale-105 transform transition shadow-sm"
                            >
                                <i className="bx bx-rocket mr-3"></i>
                                {t('getStarted')}
                            </Link>

                            <Link
                                to="/contact"
                                className="inline-flex items-center justify-center border border-sky-200/30 text-sky-200 px-8 py-4 rounded-lg font-bold bg-white/6 hover:bg-white/12 transition"
                            >
                                {t('contactSales')}
                            </Link>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default Home;
