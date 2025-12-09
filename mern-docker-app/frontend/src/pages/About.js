import React from 'react';
import 'boxicons/css/boxicons.min.css';
import Spline from '@splinetool/react-spline';
import { useLanguage } from '../contexts/LanguageContext';

const About = () => {
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

    const team = [
        {
            name: 'Dr. Sarah Johnson',
            role: t('teamMember1Role'),
            image: '/team1.jpg',
            description: t('teamMember1Desc')
        },
        {
            name: 'Mark Chen',
            role: t('teamMember2Role'),
            image: '/team2.jpg',
            description: t('teamMember2Desc')
        },
        {
            name: 'Alex Rodriguez',
            role: t('teamMember3Role'),
            image: '/team3.jpg',
            description: t('teamMember3Desc')
        }
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-black">
            {/* Full-viewport Spline background (interactive) */}
            <div aria-hidden className="fixed inset-0 z-0">
                <Spline
                    scene="https://prod.spline.design/S82vCD0u7Y-1ZAF0/scene.splinecode"
                    className="absolute inset-0 w-full h-full pointer-events-auto"
                    onError={() => {/* spline failed to load */}}
                />
            </div>
            <div className="container mx-auto px-6 py-20 relative z-10">
                {/* Hero Section */}
                <div className="text-center mb-16">
                    <h1 className="text-5xl font-bold mb-6">
                        <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                            {t('aboutTitle')}
                        </span>
                    </h1>
                    <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
                        {t('aboutDesc')}
                    </p>
                </div>

                {/* Mission Section */}
                <div className="grid lg:grid-cols-2 gap-12 mb-20">
                    <div className="space-y-6">
                        <h2 className="text-3xl font-bold text-white">{t('ourMission')}</h2>
                        <p className="text-gray-300 text-lg leading-relaxed">
                            {t('missionDesc')}
                        </p>
                        <p className="text-gray-300 text-lg leading-relaxed">
                            We believe that everyone deserves recognition for their skills and achievements, 
                            regardless of where they learned them or how they acquired them.
                        </p>
                    </div>
                    <div className="bg-gray-800/8 backdrop-blur-md border border-gray-700/8 rounded-2xl p-8">
                        <h3 className="text-2xl font-bold text-white mb-4">Why Blockchain?</h3>
                        <ul className="space-y-4 text-gray-300">
                          {whyItems.map((text, i) => (
                            <li key={i} className="flex items-start gap-3">
                              <span className={`w-8 h-8 rounded-full flex items-center justify-center ${checkBgColors[i % checkBgColors.length]} text-white mt-1`}>
                                <i className="bx bx-check"></i>
                              </span>
                              <span>{text}</span>
                            </li>
                          ))}
                        </ul>
                    </div>
                </div>

                {/* Features Grid */}
                <div className="mb-20">
                    <h2 className="text-3xl font-bold text-center text-white mb-12">Platform Features</h2>
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {features.map((feature, index) => (
                            <div
                                key={index}
                                className="bg-gray-800/8 backdrop-blur-md border border-gray-700/8 rounded-2xl p-6 text-center hover:border-blue-500/20 transition-all duration-300"
                            >
                                <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 bg-gradient-to-r ${summerGradients[index % summerGradients.length]}`}>
                                    <i className={`bx ${feature.icon} text-2xl text-white`}></i>
                                </div>
                                <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
                                <p className="text-gray-300">{feature.description}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Statistics */}
                <div className="bg-gray-800/6 backdrop-blur-md border border-gray-700/8 rounded-2xl p-8">
                    <h2 className="text-3xl font-bold text-center text-white mb-8">Platform Statistics</h2>
                    <div className="grid md:grid-cols-4 gap-8 text-center">
                        <div>
                            <div className="text-3xl font-bold text-blue-400 mb-2">15,420+</div>
                            <p className="text-gray-300">Certificates Issued</p>
                        </div>
                        <div>
                            <div className="text-3xl font-bold text-purple-400 mb-2">245+</div>
                            <p className="text-gray-300">Partner Institutions</p>
                        </div>
                        <div>
                            <div className="text-3xl font-bold text-cyan-400 mb-2">89,650+</div>
                            <p className="text-gray-300">Verifications Completed</p>
                        </div>
                        <div>
                            <div className="text-3xl font-bold text-green-400 mb-2">99.9%</div>
                            <p className="text-gray-300">Uptime Guarantee</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default About;