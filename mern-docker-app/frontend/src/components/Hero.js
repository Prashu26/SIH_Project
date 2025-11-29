import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import 'boxicons/css/boxicons.min.css';
import Spline from '@splinetool/react-spline';

const Hero = () => {
    const [currentStat, setCurrentStat] = useState(0);
    const [animatedNumbers, setAnimatedNumbers] = useState({ certificates: 0, institutions: 0, verifications: 0 });

    const stats = [
        { label: 'Certificates Issued', value: 15420, icon: 'bx-certificate' },
        { label: 'Verified Institutions', value: 245, icon: 'bx-buildings' },
        { label: 'Successful Verifications', value: 89650, icon: 'bx-shield-check' }
    ];

    // features removed (no overlay/cards shown)
    const features = [];

    // Animate numbers on component mount
    useEffect(() => {
        const animateNumber = (target, key) => {
            let current = 0;
            const increment = target / 100;
            const timer = setInterval(() => {
                current += increment;
                if (current >= target) {
                    current = target;
                    clearInterval(timer);
                }
                setAnimatedNumbers(prev => ({ ...prev, [key]: Math.floor(current) }));
            }, 20);
        };

        animateNumber(15420, 'certificates');
        animateNumber(245, 'institutions');
        animateNumber(89650, 'verifications');
    }, []);

    // Cycle through stats
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentStat(prev => (prev + 1) % stats.length);
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    return (
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
            {/* Animated Background Elements */}
            <div className="absolute inset-0">
                <div className="absolute top-20 left-10 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl animate-pulse"></div>
            </div>

            <div className="container mx-auto px-6 relative z-10">
                <div className="grid lg:grid-cols-2 gap-12 items-center">
                    {/* Left Content */}
                    <div className="space-y-8 text-center lg:text-left">
                        {/* Badge */}
                        <div className="inline-flex items-center gap-3 bg-gradient-to-r from-blue-600/20 to-purple-600/20 backdrop-blur-md border border-blue-500/30 rounded-full px-6 py-3">
                            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                            <span className="text-sm font-medium text-gray-300">Blockchain-Powered Credentialing</span>
                        </div>

                        {/* Main Heading */}
                        <div className="space-y-4">
                            <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold leading-tight">
                                <span className="text-white">
                                    Secure
                                </span>
                                <br />
                                <span className="text-white">
                                    Digital Credentials
                                </span>
                            </h1>
                            <p className="text-xl text-gray-300 leading-relaxed max-w-2xl mx-auto lg:mx-0">
                                Revolutionize skill verification with blockchain technology. 
                                Issue, verify, and showcase credentials that employers trust worldwide.
                            </p>
                        </div>

                        {/* CTA Buttons */}
                        <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                            <Link 
                                to="/register"
                                className="group bg-gradient-to-r from-[#CFCFCF]-600 to-purple-600 hover:from-yellow-700 hover:to-purple-700 text-white px-8 py-4 rounded-xl font-semibold transition-all duration-300 shadow-lg shadow-yellow-500/25 hover:shadow-yellow-500/40 hover:scale-105 flex items-center justify-center gap-3"
                            >
                                <span>Get Started</span>
                                <i className="bx bx-rocket group-hover:translate-x-1 transition-transform"></i>
                            </Link>
                            <Link 
                                to="/verify"
                                className="group border border-gray-600 hover:border-gray-500 text-white hover:bg-gray-800/50 px-8 py-4 rounded-xl font-semibold transition-all duration-300 flex items-center justify-center gap-3"
                            >
                                <span>Verify Certificate</span>
                                <i className="bx bx-shield-check group-hover:scale-110 transition-transform"></i>
                            </Link>
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-3 gap-6 pt-8">
                            {stats.map((stat, index) => (
                                <div key={index} className="text-center space-y-2">
                                    <div className={`text-2xl lg:text-3xl font-bold transition-all duration-500 ${
                                        currentStat === index ? 'text-blue-400 scale-110' : 'text-white'
                                    }`}>
                                        {index === 0 && animatedNumbers.certificates.toLocaleString()}
                                        {index === 1 && animatedNumbers.institutions.toLocaleString()}
                                        {index === 2 && animatedNumbers.verifications.toLocaleString()}
                                    </div>
                                    <p className="text-sm text-gray-400">{stat.label}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right Content - 3D Animation or Features */}
                    <div className="relative">
                        {/* Try to load Spline, fallback to features if failed */}
                        <div className="relative h-96 lg:h-[900px]">
                            <Spline 
                                className="absolute inset-0 w-full h-full"
                                scene="https://prod.spline.design/X2P2Rc3tC6yDbbYl/scene.splinecode"
                                onError={() => console.log('Spline failed to load, showing features instead')}
                            />
                            
                            {/* Features overlay removed; Spline is shown full */}
                        </div>
                    </div>
                </div>

                {/* Scroll Indicator */}
                <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
                    <i className="bx bx-chevron-down text-gray-400 text-2xl"></i>
                </div>
            </div>
        </section>
    );
};

export default Hero;
