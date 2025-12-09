import React from 'react';
import 'boxicons/css/boxicons.min.css';
import Spline from '@splinetool/react-spline';
import { useLanguage } from '../contexts/LanguageContext';

const Features = () => {
    const { t } = useLanguage();

    const features = [
        {
            icon: 'bx-shield-check',
            title: t('blockchainSecurity'),
            description: t('blockchainSecurityDesc')
        },
        {
            icon: 'bx-time',
            title: t('instantVerification'),
            description: t('instantVerificationDesc')
        },
        {
            icon: 'bx-globe',
            title: t('globalRecognition'),
            description: t('globalRecognitionDesc')
        },
        {
            icon: 'bx-fingerprint',
            title: t('digitalIdentity'),
            description: t('digitalIdentityDesc')
        }
    ];

    // summer vibe gradients for icon backgrounds (cycled)
    const summerGradients = [
      'from-yellow-400/90 to-pink-400/90',
      'from-emerald-300/90 to-yellow-300/90',
      'from-cyan-300/90 to-rose-400/90',
      'from-orange-400/90 to-amber-300/90'
    ];
    
    // Why-block list items (mapped so we can color the check badges)
    const whyItems = [
      t('whyItem1'),
      t('whyItem2'),
      t('whyItem3'),
      t('whyItem4')
    ];
    
    const checkBgColors = ['bg-yellow-400', 'bg-emerald-300', 'bg-cyan-300', 'bg-orange-400'];

    // --- Add missing feature groups to fix build errors ---
    const mainFeatures = [
      {
        icon: 'bx-shield-check',
        title: t('mf1Title'),
        description: t('mf1Desc'),
        details: [
          t('mf1d1'),
          t('mf1d2'),
          t('mf1d3'),
          t('mf1d4')
        ]
      },
      {
        icon: 'bx-time',
        title: t('mf2Title'),
        description: t('mf2Desc'),
        details: [
          t('mf2d1'),
          t('mf2d2'),
          t('mf2d3'),
          t('mf2d4')
        ]
      },
      {
        icon: 'bx-globe',
        title: t('mf3Title'),
        description: t('mf3Desc'),
        details: [
          t('mf3d1'),
          t('mf3d2'),
          t('mf3d3'),
          t('mf3d4')
        ]
      }
    ];

    const technicalFeatures = [
      { icon: 'bx-data', title: t('tf1Title'), description: t('tf1Desc') },
      { icon: 'bx-lock', title: t('tf2Title'), description: t('tf2Desc') },
      { icon: 'bx-mobile', title: t('tf3Title'), description: t('tf3Desc') },
      { icon: 'bx-sync', title: t('tf4Title'), description: t('tf4Desc') },
      { icon: 'bx-cloud', title: t('tf5Title'), description: t('tf5Desc') },
      { icon: 'bx-support', title: t('tf6Title'), description: t('tf6Desc') }
    ];

    const useCases = [
      {
        title: t('uc1Title'),
        description: t('uc1Desc'),
        icon: 'bx-book',
        benefits: [t('uc1b1'), t('uc1b2'), t('uc1b3'), t('uc1b4')]
      },
      {
        title: t('uc2Title'),
        description: t('uc2Desc'),
        icon: 'bx-briefcase',
        benefits: [t('uc2b1'), t('uc2b2'), t('uc2b3'), t('uc2b4')]
      },
      {
        title: t('uc3Title'),
        description: t('uc3Desc'),
        icon: 'bx-laptop',
        benefits: [t('uc3b1'), t('uc3b2'), t('uc3b3'), t('uc3b4')]
      }
    ];
    // --- end added code ---
    
    const team = [
        {
            name: 'Dr. Sarah Johnson',
            role: 'Lead Blockchain Developer',
            image: '/team1.jpg',
            description: 'Expert in blockchain technology with 10+ years in cryptographic systems.'
        },
        {
            name: 'Mark Chen',
            role: 'UI/UX Designer',
            image: '/team2.jpg',
            description: 'Passionate about creating intuitive experiences for complex technologies.'
        },
        {
            name: 'Alex Rodriguez',
            role: 'Full Stack Developer',
            image: '/team3.jpg',
            description: 'Specialized in building scalable applications with modern technologies.'
        }
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-black">
            {/* Full-viewport Spline background (interactive) */}
            <div aria-hidden className="fixed inset-0 z-0">
                <Spline
                    scene="https://prod.spline.design/wdyIOhdyqSitJeNM/scene.splinecode"
                    className="absolute inset-0 w-full h-full pointer-events-auto"
                    onError={() => {/* spline failed to load */}}
                />
            </div>
            <div className="container mx-auto px-6 py-20 relative z-10">
                {/* Hero Section */}
                <div className="text-center mb-16">
                    <h1 className="text-5xl font-bold mb-6">
                        <span className="bg-gradient-to-r from-yellow-300 to-pink-300 bg-clip-text text-transparent">
                            {t('featuresTitle')}
                        </span>
                    </h1>
                    <p className="text-xl text-amber-100 max-w-3xl mx-auto leading-relaxed">
                        {t('featuresDesc')}
                    </p>
                </div>

                {/* Main Features */}
                <div className="mb-20">
                    <h2 className="text-3xl font-bold text-center text-amber-200 mb-12">{t('coreFeatures')}</h2>
                    <div className="space-y-12">
                        {mainFeatures.map((feature, index) => (
                            <div key={index} className={`grid lg:grid-cols-2 gap-12 items-center ${index % 2 === 1 ? 'lg:grid-flow-col-dense' : ''}`}>
                                <div className={`space-y-6 ${index % 2 === 1 ? 'lg:col-start-2' : ''}`}>
                                    <div className="flex items-center gap-4">
                                        <div className={`bg-gradient-to-r ${summerGradients[index % summerGradients.length]} w-16 h-16 rounded-2xl flex items-center justify-center shadow-[0_8px_24px_rgba(255,140,95,0.14)]`}>
                                            <i className={`bx ${feature.icon} text-2xl text-white`}></i>
                                        </div>
                                        <h3 className="text-3xl font-bold text-amber-100">{feature.title}</h3>
                                    </div>
                                    <p className="text-lg text-amber-200 leading-relaxed">{feature.description}</p>
                                    <ul className="space-y-3">
                                        {feature.details.map((detail, idx) => (
                                            <li key={idx} className="flex items-center gap-3 text-amber-100">
                                                <i className="bx bx-check-circle text-amber-300"></i>
                                                <span className="text-amber-100">{detail}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                <div className={`bg-white/6 backdrop-blur-md border border-white/8 rounded-2xl p-8 ${index % 2 === 1 ? 'lg:col-start-1 lg:row-start-1' : ''}`}>
                                    <div className="text-center">
                                        <i className={`bx ${feature.icon} text-6xl text-pink-300 mb-4`}></i>
                                        <h4 className="text-xl font-bold text-amber-100 mb-2">{feature.title}</h4>
                                        <p className="text-amber-200">{t('interactiveDemo')}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Technical Features Grid */}
                <div className="mb-20">
                    <h2 className="text-3xl font-bold text-center text-amber-200 mb-12">{t('technicalCapabilities')}</h2>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {technicalFeatures.map((feature, index) => (
                            <div key={index} className="bg-white/6 backdrop-blur-md border border-white/8 rounded-2xl p-6 hover:scale-105 transition-transform duration-200">
                                <div className={`bg-gradient-to-r ${summerGradients[index % summerGradients.length]} w-12 h-12 rounded-xl flex items-center justify-center mb-4 shadow-[0_6px_18px_rgba(255,160,120,0.12)]`}>
                                    <i className={`bx ${feature.icon} text-xl text-white`}></i>
                                </div>
                                <h3 className="text-xl font-bold text-amber-100 mb-3">{feature.title}</h3>
                                <p className="text-amber-200">{feature.description}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Use Cases */}
                <div className="mb-20">
                    <h2 className="text-3xl font-bold text-center text-amber-200 mb-12">{t('useCasesTitle')}</h2>
                    <div className="grid lg:grid-cols-3 gap-8">
                        {useCases.map((useCase, index) => (
                            <div key={index} className="bg-white/6 backdrop-blur-md border border-white/8 rounded-2xl p-8">
                                <div className="text-center mb-6">
                                    <div className={`bg-gradient-to-r ${summerGradients[index % summerGradients.length]} w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-[0_8px_24px_rgba(255,140,95,0.10)]`}>
                                        <i className={`bx ${useCase.icon} text-2xl text-white`}></i>
                                    </div>
                                    <h3 className="text-2xl font-bold text-amber-100 mb-3">{useCase.title}</h3>
                                    <p className="text-amber-200">{useCase.description}</p>
                                </div>
                                <div className="space-y-3">
                                    <h4 className="text-lg font-semibold text-amber-100">{t('keyBenefits')}</h4>
                                    <ul className="space-y-2">
                                        {useCase.benefits.map((benefit, idx) => (
                                            <li key={idx} className="flex items-center gap-2 text-amber-100 text-sm">
                                                <i className="bx bx-check text-amber-300 text-sm"></i>
                                                <span className="text-amber-100">{benefit}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* API Integration */}
                <div className="bg-white/6 backdrop-blur-md border border-white/8 rounded-2xl p-8">
                    <div className="text-center mb-8">
                        <h2 className="text-3xl font-bold text-amber-200 mb-4">{t('devApiTitle')}</h2>
                        <p className="text-lg text-amber-100 max-w-2xl mx-auto">
                            {t('devApiDesc')}
                        </p>
                    </div>
                    <div className="grid md:grid-cols-3 gap-8 text-center">
                        <div>
                            <i className="bx bx-code-alt text-4xl text-yellow-300 mb-4"></i>
                            <h3 className="text-xl font-bold text-amber-100 mb-2">{t('apiRestTitle')}</h3>
                            <p className="text-amber-200">{t('apiRestDesc')}</p>
                        </div>
                        <div>
                            <i className="bx bx-book-open text-4xl text-pink-300 mb-4"></i>
                            <h3 className="text-xl font-bold text-amber-100 mb-2">{t('apiDocTitle')}</h3>
                            <p className="text-amber-200">{t('apiDocDesc')}</p>
                        </div>
                        <div>
                            <i className="bx bx-support text-4xl text-rose-300 mb-4"></i>
                            <h3 className="text-xl font-bold text-amber-100 mb-2">{t('apiSdkTitle')}</h3>
                            <p className="text-amber-200">{t('apiSdkDesc')}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Features;



