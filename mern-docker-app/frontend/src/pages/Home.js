import React from 'react';
import { Link } from 'react-router-dom';
import 'boxicons/css/boxicons.min.css';

const Home = () => {
    const features = [
        {
            icon: 'bx-shield-check',
            title: 'Blockchain Security',
            description: 'Immutable certificate verification using cutting-edge blockchain technology',
            color: 'from-blue-500 to-cyan-500'
        },
        {
            icon: 'bx-time',
            title: 'Instant Verification',
            description: 'Real-time certificate validation in seconds, not days or weeks',
            color: 'from-purple-500 to-pink-500'
        },
        {
            icon: 'bx-globe',
            title: 'Global Recognition',
            description: 'Internationally accepted credentials that open doors worldwide',
            color: 'from-green-500 to-teal-500'
        },
        {
            icon: 'bx-fingerprint',
            title: 'Digital Identity',
            description: 'Secure digital profiles showcasing verified skills and achievements',
            color: 'from-orange-500 to-red-500'
        }
    ];

    const steps = [
        {
            step: '01',
            title: 'Register',
            description: 'Create your account as a learner or institution',
            icon: 'bx-user-plus'
        },
        {
            step: '02',
            title: 'Issue Certificate',
            description: 'Institutions issue blockchain-secured certificates',
            icon: 'bx-certificate'
        },
        {
            step: '03',
            title: 'Verify Instantly',
            description: 'Anyone can verify certificates using our secure platform',
            icon: 'bx-check-shield'
        }
    ];

    const testimonials = [
        {
            name: 'Sarah Johnson',
            role: 'University Registrar',
            comment: 'Our certificate fraud cases dropped to zero after implementing this platform.',
            avatar: 'S'
        },
        {
            name: 'Mark Chen',
            role: 'HR Director',
            comment: 'Verification that used to take weeks now happens in seconds. Amazing!',
            avatar: 'M'
        },
        {
            name: 'Emily Rodriguez',
            role: 'Online Learner',
            comment: 'My certificates are now globally recognized. This changed my career prospects.',
            avatar: 'E'
        }
    ];

    return (
        <div className="space-y-20">
            {/* Features Section */}
            <section className="container mx-auto px-6 py-20">
                <div className="text-center mb-16">
                    <h2 className="text-4xl font-bold mb-4">
                        <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                            Why Choose Our Platform?
                        </span>
                    </h2>
                    <p className="text-xl text-gray-300 max-w-3xl mx-auto">
                        Experience the future of credential verification with our blockchain-powered platform
                    </p>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {features.map((feature, index) => (
                        <div key={index} className="group bg-gray-800/50 backdrop-blur-md border border-gray-700 rounded-2xl p-6 hover:border-blue-500/50 transition-all duration-300 hover:scale-105">
                            <div className={`bg-gradient-to-r ${feature.color} w-16 h-16 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                                <i className={`bx ${feature.icon} text-2xl text-white`}></i>
                            </div>
                            <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
                            <p className="text-gray-300">{feature.description}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* How it Works Section */}
            <section className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 backdrop-blur-md">
                <div className="container mx-auto px-6 py-20">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl font-bold mb-4 text-white">How It Works</h2>
                        <p className="text-xl text-gray-300 max-w-2xl mx-auto">
                            Simple steps to secure, issue, and verify digital credentials
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {steps.map((step, index) => (
                            <div key={index} className="text-center relative">
                                {/* Connection Line */}
                                {index < steps.length - 1 && (
                                    <div className="hidden md:block absolute top-16 left-[60%] w-full h-0.5 bg-gradient-to-r from-blue-500 to-purple-500"></div>
                                )}
                                
                                <div className="bg-gray-800/50 backdrop-blur-md border border-gray-700 rounded-2xl p-8 relative z-10">
                                    <div className="bg-gradient-to-r from-blue-500 to-purple-500 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                                        <i className={`bx ${step.icon} text-3xl text-white`}></i>
                                    </div>
                                    <div className="text-blue-400 font-bold text-lg mb-2">Step {step.step}</div>
                                    <h3 className="text-2xl font-bold text-white mb-4">{step.title}</h3>
                                    <p className="text-gray-300">{step.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Quick Actions */}
            <section className="container mx-auto px-6 py-20">
                <div className="text-center mb-16">
                    <h2 className="text-4xl font-bold mb-4 text-white">Get Started Today</h2>
                    <p className="text-xl text-gray-300 max-w-2xl mx-auto">
                        Join thousands of institutions and learners already using our platform
                    </p>
                </div>

                <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
                    <Link to="/register" className="group bg-gradient-to-r from-blue-600 to-purple-600 p-8 rounded-2xl hover:from-blue-700 hover:to-purple-700 transition-all duration-300 hover:scale-105">
                        <i className="bx bx-user-plus text-4xl text-white mb-4 block group-hover:scale-110 transition-transform"></i>
                        <h3 className="text-2xl font-bold text-white mb-3">Sign Up</h3>
                        <p className="text-blue-100">Create your account and start issuing or collecting certificates</p>
                        <div className="mt-4 text-blue-200 group-hover:text-white transition-colors">
                            Get Started <i className="bx bx-right-arrow-alt ml-2"></i>
                        </div>
                    </Link>

                    <Link to="/verify" className="group bg-gray-800/50 backdrop-blur-md border border-gray-700 p-8 rounded-2xl hover:border-blue-500/50 transition-all duration-300 hover:scale-105">
                        <i className="bx bx-search text-4xl text-blue-400 mb-4 block group-hover:scale-110 transition-transform"></i>
                        <h3 className="text-2xl font-bold text-white mb-3">Verify Certificate</h3>
                        <p className="text-gray-300">Instantly verify any certificate using our blockchain verification</p>
                        <div className="mt-4 text-blue-400 group-hover:text-blue-300 transition-colors">
                            Verify Now <i className="bx bx-right-arrow-alt ml-2"></i>
                        </div>
                    </Link>

                    <Link to="/features" className="group bg-gray-800/50 backdrop-blur-md border border-gray-700 p-8 rounded-2xl hover:border-purple-500/50 transition-all duration-300 hover:scale-105">
                        <i className="bx bx-star text-4xl text-purple-400 mb-4 block group-hover:scale-110 transition-transform"></i>
                        <h3 className="text-2xl font-bold text-white mb-3">Explore Features</h3>
                        <p className="text-gray-300">Discover all the powerful features our platform offers</p>
                        <div className="mt-4 text-purple-400 group-hover:text-purple-300 transition-colors">
                            Learn More <i className="bx bx-right-arrow-alt ml-2"></i>
                        </div>
                    </Link>
                </div>
            </section>

            {/* Testimonials */}
            <section className="bg-gradient-to-r from-gray-900/50 to-gray-800/50 backdrop-blur-md">
                <div className="container mx-auto px-6 py-20">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl font-bold mb-4 text-white">What Our Users Say</h2>
                        <p className="text-xl text-gray-300 max-w-2xl mx-auto">
                            Hear from institutions and learners who trust our platform
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {testimonials.map((testimonial, index) => (
                            <div key={index} className="bg-gray-800/50 backdrop-blur-md border border-gray-700 rounded-2xl p-6">
                                <div className="flex items-center mb-4">
                                    <div className="bg-gradient-to-r from-blue-500 to-purple-500 w-12 h-12 rounded-full flex items-center justify-center mr-4">
                                        <span className="text-white font-bold">{testimonial.avatar}</span>
                                    </div>
                                    <div>
                                        <h3 className="text-white font-semibold">{testimonial.name}</h3>
                                        <p className="text-gray-400 text-sm">{testimonial.role}</p>
                                    </div>
                                </div>
                                <p className="text-gray-300 italic">"{testimonial.comment}"</p>
                                <div className="flex text-yellow-400 mt-3">
                                    {[...Array(5)].map((_, i) => (
                                        <i key={i} className="bx bxs-star text-sm"></i>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Stats Section */}
            <section className="container mx-auto px-6 py-20">
                <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 backdrop-blur-md border border-blue-500/30 rounded-2xl p-8">
                    <div className="grid md:grid-cols-4 gap-8 text-center">
                        <div>
                            <div className="text-4xl font-bold text-blue-400 mb-2">15,420+</div>
                            <p className="text-gray-300">Certificates Issued</p>
                        </div>
                        <div>
                            <div className="text-4xl font-bold text-purple-400 mb-2">245+</div>
                            <p className="text-gray-300">Partner Institutions</p>
                        </div>
                        <div>
                            <div className="text-4xl font-bold text-cyan-400 mb-2">89,650+</div>
                            <p className="text-gray-300">Verifications Completed</p>
                        </div>
                        <div>
                            <div className="text-4xl font-bold text-green-400 mb-2">99.9%</div>
                            <p className="text-gray-300">Uptime Guarantee</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="container mx-auto px-6 pb-20">
                <div className="text-center bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-12">
                    <h2 className="text-4xl font-bold text-white mb-4">Ready to Get Started?</h2>
                    <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
                        Join the future of credential verification. Secure, fast, and globally recognized.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link to="/register" className="bg-white text-blue-600 px-8 py-4 rounded-lg font-bold hover:bg-gray-100 transition-colors">
                            Start Free Trial
                        </Link>
                        <Link to="/contact" className="border border-white text-white px-8 py-4 rounded-lg font-bold hover:bg-white/10 transition-colors">
                            Contact Sales
                        </Link>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default Home;
