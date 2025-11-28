import React from 'react';
import 'boxicons/css/boxicons.min.css';

const Features = () => {
    const mainFeatures = [
        {
            icon: 'bx-shield-quarter',
            title: 'Blockchain Security',
            description: 'Leveraging Ethereum blockchain technology for immutable certificate storage',
            details: [
                'Smart contract-based verification',
                'Cryptographic proof of authenticity',
                'Tamper-proof certificate records',
                'Decentralized validation network'
            ]
        },
        {
            icon: 'bx-time-five',
            title: 'Instant Verification',
            description: 'Real-time certificate validation in seconds, not days',
            details: [
                'QR code scanning for quick access',
                'API-based verification system',
                'Mobile-friendly verification portal',
                '24/7 automated validation'
            ]
        },
        {
            icon: 'bx-globe',
            title: 'Global Recognition',
            description: 'Internationally accepted credentials that open doors worldwide',
            details: [
                'Multi-language support',
                'International standards compliance',
                'Cross-border verification',
                'Industry-wide acceptance'
            ]
        }
    ];

    const technicalFeatures = [
        {
            icon: 'bx-data',
            title: 'IPFS Storage',
            description: 'Distributed storage for certificate metadata and documents'
        },
        {
            icon: 'bx-lock',
            title: 'End-to-End Encryption',
            description: 'Military-grade encryption for sensitive information'
        },
        {
            icon: 'bx-mobile',
            title: 'Mobile Responsive',
            description: 'Access and verify certificates from any device'
        },
        {
            icon: 'bx-sync',
            title: 'Real-time Sync',
            description: 'Instant updates across all platforms and devices'
        },
        {
            icon: 'bx-cloud',
            title: 'Cloud Integration',
            description: 'Seamless integration with existing cloud infrastructure'
        },
        {
            icon: 'bx-support',
            title: '24/7 Support',
            description: 'Round-the-clock technical and customer support'
        }
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

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-black">
            <div className="container mx-auto px-6 py-20">
                {/* Hero Section */}
                <div className="text-center mb-16">
                    <h1 className="text-5xl font-bold mb-6">
                        <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                            Platform Features
                        </span>
                    </h1>
                    <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
                        Discover the powerful features that make our blockchain credentialing platform 
                        the most secure and reliable solution for digital certificates.
                    </p>
                </div>

                {/* Main Features */}
                <div className="mb-20">
                    <h2 className="text-3xl font-bold text-center text-white mb-12">Core Features</h2>
                    <div className="space-y-12">
                        {mainFeatures.map((feature, index) => (
                            <div key={index} className={`grid lg:grid-cols-2 gap-12 items-center ${index % 2 === 1 ? 'lg:grid-flow-col-dense' : ''}`}>
                                <div className={`space-y-6 ${index % 2 === 1 ? 'lg:col-start-2' : ''}`}>
                                    <div className="flex items-center gap-4">
                                        <div className="bg-gradient-to-r from-blue-500 to-purple-500 w-16 h-16 rounded-2xl flex items-center justify-center">
                                            <i className={`bx ${feature.icon} text-2xl text-white`}></i>
                                        </div>
                                        <h3 className="text-3xl font-bold text-white">{feature.title}</h3>
                                    </div>
                                    <p className="text-xl text-gray-300 leading-relaxed">{feature.description}</p>
                                    <ul className="space-y-3">
                                        {feature.details.map((detail, idx) => (
                                            <li key={idx} className="flex items-center gap-3">
                                                <i className="bx bx-check-circle text-green-400"></i>
                                                <span className="text-gray-300">{detail}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                <div className={`bg-gradient-to-br from-blue-600/20 to-purple-600/20 backdrop-blur-md border border-blue-500/30 rounded-2xl p-8 ${index % 2 === 1 ? 'lg:col-start-1 lg:row-start-1' : ''}`}>
                                    <div className="text-center">
                                        <i className={`bx ${feature.icon} text-6xl text-blue-400 mb-4`}></i>
                                        <h4 className="text-xl font-bold text-white mb-2">{feature.title}</h4>
                                        <p className="text-gray-300">Interactive demonstration available</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Technical Features Grid */}
                <div className="mb-20">
                    <h2 className="text-3xl font-bold text-center text-white mb-12">Technical Capabilities</h2>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {technicalFeatures.map((feature, index) => (
                            <div key={index} className="bg-gray-800/50 backdrop-blur-md border border-gray-700 rounded-2xl p-6 hover:border-blue-500/50 transition-all duration-300 hover:scale-105">
                                <div className="bg-gradient-to-r from-blue-500 to-purple-500 w-12 h-12 rounded-xl flex items-center justify-center mb-4">
                                    <i className={`bx ${feature.icon} text-xl text-white`}></i>
                                </div>
                                <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
                                <p className="text-gray-300">{feature.description}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Use Cases */}
                <div className="mb-20">
                    <h2 className="text-3xl font-bold text-center text-white mb-12">Use Cases</h2>
                    <div className="grid lg:grid-cols-3 gap-8">
                        {useCases.map((useCase, index) => (
                            <div key={index} className="bg-gray-800/50 backdrop-blur-md border border-gray-700 rounded-2xl p-8">
                                <div className="text-center mb-6">
                                    <div className="bg-gradient-to-r from-blue-500 to-purple-500 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <i className={`bx ${useCase.icon} text-2xl text-white`}></i>
                                    </div>
                                    <h3 className="text-2xl font-bold text-white mb-3">{useCase.title}</h3>
                                    <p className="text-gray-300">{useCase.description}</p>
                                </div>
                                <div className="space-y-3">
                                    <h4 className="text-lg font-semibold text-white">Key Benefits:</h4>
                                    <ul className="space-y-2">
                                        {useCase.benefits.map((benefit, idx) => (
                                            <li key={idx} className="flex items-center gap-2">
                                                <i className="bx bx-check text-green-400 text-sm"></i>
                                                <span className="text-gray-300 text-sm">{benefit}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* API Integration */}
                <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 backdrop-blur-md border border-blue-500/30 rounded-2xl p-8">
                    <div className="text-center mb-8">
                        <h2 className="text-3xl font-bold text-white mb-4">Developer-Friendly API</h2>
                        <p className="text-xl text-gray-300 max-w-2xl mx-auto">
                            Integrate our verification system into your existing applications with our comprehensive RESTful API.
                        </p>
                    </div>
                    <div className="grid md:grid-cols-3 gap-8 text-center">
                        <div>
                            <i className="bx bx-code-alt text-4xl text-blue-400 mb-4"></i>
                            <h3 className="text-xl font-bold text-white mb-2">RESTful API</h3>
                            <p className="text-gray-300">Easy-to-use endpoints for certificate operations</p>
                        </div>
                        <div>
                            <i className="bx bx-book-open text-4xl text-purple-400 mb-4"></i>
                            <h3 className="text-xl font-bold text-white mb-2">Documentation</h3>
                            <p className="text-gray-300">Comprehensive guides and code examples</p>
                        </div>
                        <div>
                            <i className="bx bx-support text-4xl text-cyan-400 mb-4"></i>
                            <h3 className="text-xl font-bold text-white mb-2">SDK Support</h3>
                            <p className="text-gray-300">SDKs for popular programming languages</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Features;