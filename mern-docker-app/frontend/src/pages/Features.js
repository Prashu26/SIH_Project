import React from 'react';
import 'boxicons/css/boxicons.min.css';
import Spline from '@splinetool/react-spline';

const Features = () => {
    const features = [
        {
            icon: 'bx-shield-check',
            title: 'Blockchain Security',
            description: 'All certificates are secured using immutable blockchain technology, ensuring they cannot be tampered with or forged.'
        },
        {
            icon: 'bx-time',
            title: 'Instant Verification',
            description: 'Verify any certificate in seconds with our advanced verification system powered by smart contracts.'
        },
        {
            icon: 'bx-globe',
            title: 'Global Acceptance',
            description: 'Our certificates are recognized worldwide and can be verified by any employer or institution.'
        },
        {
            icon: 'bx-fingerprint',
            title: 'Digital Identity',
            description: 'Create a secure digital identity that showcases all your verified skills and achievements.'
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
      'Immutable records that cannot be altered or deleted',
      'Decentralized verification without third-party dependencies',
      'Global accessibility and transparency',
      'Cost-effective and efficient verification process'
    ];
    
    const checkBgColors = ['bg-yellow-400', 'bg-emerald-300', 'bg-cyan-300', 'bg-orange-400'];

    // --- Add missing feature groups to fix build errors ---
    const mainFeatures = [
      {
        icon: 'bx-shield-check',
        title: 'Blockchain Security',
        description: 'Leveraging blockchain to provide immutable, verifiable credentials.',
        details: [
          'Smart contract-based verification',
          'Cryptographic proof of authenticity',
          'Tamper-proof certificate records',
          'Decentralized validation network'
        ]
      },
      {
        icon: 'bx-time',
        title: 'Instant Verification',
        description: 'Verify any certificate in seconds with our verification APIs.',
        details: [
          'API-first verification',
          'QR code & file upload support',
          'Low-latency responses',
          'Scalable verification pipeline'
        ]
      },
      {
        icon: 'bx-globe',
        title: 'Global Recognition',
        description: 'Trusted credentials accepted by institutions and employers worldwide.',
        details: [
          'Cross-border verification',
          'Multi-language support',
          'Standards compliance',
          'Interoperable metadata'
        ]
      }
    ];

    const technicalFeatures = [
      { icon: 'bx-data', title: 'IPFS Storage', description: 'Distributed storage for certificate metadata and documents' },
      { icon: 'bx-lock', title: 'End-to-End Encryption', description: 'Encryption for sensitive certificate payloads' },
      { icon: 'bx-mobile', title: 'Mobile Responsive', description: 'Verify on any device' },
      { icon: 'bx-sync', title: 'Real-time Sync', description: 'Immediate updates across systems' },
      { icon: 'bx-cloud', title: 'Cloud Integration', description: 'Seamless integration with cloud providers' },
      { icon: 'bx-support', title: '24/7 Support', description: 'Operations & developer support' }
    ];

    const useCases = [
      {
        title: 'Educational Institutions',
        description: 'Universities and schools issuing verified diplomas and certificates',
        icon: 'bx-book',
        benefits: ['Reduced fraud', 'Automated verification', 'Global recognition', 'Cost savings']
      },
      {
        title: 'Professional Training',
        description: 'Corporate training programs and skill certification',
        icon: 'bx-briefcase',
        benefits: ['Employee validation', 'Skill tracking', 'Compliance management', 'Career progression']
      },
      {
        title: 'Online Learning',
        description: 'MOOCs and e-learning platforms verifying course completion',
        icon: 'bx-laptop',
        benefits: ['Course credibility', 'Learner motivation', 'Quality assurance', 'Market trust']
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
                            Platform Features
                        </span>
                    </h1>
                    <p className="text-xl text-amber-100 max-w-3xl mx-auto leading-relaxed">
                        Discover the powerful features that make our blockchain credentialing platform 
                        the most secure and reliable solution for digital certificates.
                    </p>
                </div>

                {/* Main Features */}
                <div className="mb-20">
                    <h2 className="text-3xl font-bold text-center text-amber-200 mb-12">Core Features</h2>
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
                                        <p className="text-amber-200">Interactive demonstration available</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Technical Features Grid */}
                <div className="mb-20">
                    <h2 className="text-3xl font-bold text-center text-amber-200 mb-12">Technical Capabilities</h2>
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
                    <h2 className="text-3xl font-bold text-center text-amber-200 mb-12">Use Cases</h2>
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
                                    <h4 className="text-lg font-semibold text-amber-100">Key Benefits:</h4>
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
                        <h2 className="text-3xl font-bold text-amber-200 mb-4">Developer-Friendly API</h2>
                        <p className="text-lg text-amber-100 max-w-2xl mx-auto">
                            Integrate our verification system into your existing applications with our comprehensive RESTful API.
                        </p>
                    </div>
                    <div className="grid md:grid-cols-3 gap-8 text-center">
                        <div>
                            <i className="bx bx-code-alt text-4xl text-yellow-300 mb-4"></i>
                            <h3 className="text-xl font-bold text-amber-100 mb-2">RESTful API</h3>
                            <p className="text-amber-200">Easy-to-use endpoints for certificate operations</p>
                        </div>
                        <div>
                            <i className="bx bx-book-open text-4xl text-pink-300 mb-4"></i>
                            <h3 className="text-xl font-bold text-amber-100 mb-2">Documentation</h3>
                            <p className="text-amber-200">Comprehensive guides and code examples</p>
                        </div>
                        <div>
                            <i className="bx bx-support text-4xl text-rose-300 mb-4"></i>
                            <h3 className="text-xl font-bold text-amber-100 mb-2">SDK Support</h3>
                            <p className="text-amber-200">SDKs for popular programming languages</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Features;



