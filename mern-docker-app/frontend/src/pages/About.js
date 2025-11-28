import React from 'react';
import 'boxicons/css/boxicons.min.css';

const About = () => {
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
            <div className="container mx-auto px-6 py-20">
                {/* Hero Section */}
                <div className="text-center mb-16">
                    <h1 className="text-5xl font-bold mb-6">
                        <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                            About Our Platform
                        </span>
                    </h1>
                    <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
                        We're revolutionizing how skills and achievements are verified in the digital age. 
                        Our blockchain-powered platform ensures that your credentials are secure, 
                        verifiable, and globally recognized.
                    </p>
                </div>

                {/* Mission Section */}
                <div className="grid lg:grid-cols-2 gap-12 mb-20">
                    <div className="space-y-6">
                        <h2 className="text-3xl font-bold text-white">Our Mission</h2>
                        <p className="text-gray-300 text-lg leading-relaxed">
                            To create a trustworthy, transparent, and tamper-proof system for skill verification 
                            that empowers learners, supports educators, and helps employers make informed decisions.
                        </p>
                        <p className="text-gray-300 text-lg leading-relaxed">
                            We believe that everyone deserves recognition for their skills and achievements, 
                            regardless of where they learned them or how they acquired them.
                        </p>
                    </div>
                    <div className="bg-gray-800/50 backdrop-blur-md border border-gray-700 rounded-2xl p-8">
                        <h3 className="text-2xl font-bold text-white mb-4">Why Blockchain?</h3>
                        <ul className="space-y-4 text-gray-300">
                            <li className="flex items-start gap-3">
                                <i className="bx bx-check-circle text-green-400 mt-1"></i>
                                <span>Immutable records that cannot be altered or deleted</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <i className="bx bx-check-circle text-green-400 mt-1"></i>
                                <span>Decentralized verification without third-party dependencies</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <i className="bx bx-check-circle text-green-400 mt-1"></i>
                                <span>Global accessibility and transparency</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <i className="bx bx-check-circle text-green-400 mt-1"></i>
                                <span>Cost-effective and efficient verification process</span>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Features Grid */}
                <div className="mb-20">
                    <h2 className="text-3xl font-bold text-center text-white mb-12">Platform Features</h2>
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {features.map((feature, index) => (
                            <div key={index} className="bg-gray-800/50 backdrop-blur-md border border-gray-700 rounded-2xl p-6 text-center hover:border-blue-500/50 transition-all duration-300">
                                <div className="bg-gradient-to-r from-blue-500 to-purple-500 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <i className={`bx ${feature.icon} text-2xl text-white`}></i>
                                </div>
                                <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
                                <p className="text-gray-300">{feature.description}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Team Section */}
                <div className="mb-20">
                    <h2 className="text-3xl font-bold text-center text-white mb-12">Meet Our Team</h2>
                    <div className="grid md:grid-cols-3 gap-8">
                        {team.map((member, index) => (
                            <div key={index} className="bg-gray-800/50 backdrop-blur-md border border-gray-700 rounded-2xl p-6 text-center">
                                <div className="w-24 h-24 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full mx-auto mb-4 flex items-center justify-center">
                                    <i className="bx bx-user text-3xl text-white"></i>
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2">{member.name}</h3>
                                <p className="text-blue-400 mb-3">{member.role}</p>
                                <p className="text-gray-300 text-sm">{member.description}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Statistics */}
                <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 backdrop-blur-md border border-blue-500/30 rounded-2xl p-8">
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