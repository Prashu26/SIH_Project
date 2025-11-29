import React from "react";

const teamMembers = [
  {
    name: "Adithya Kashyap M S",
    img: "/adithyadp.png",
  },
  {
    name: "Prashanth H M",
    img: "/prashanth.jpeg",
  },
  {
    name: "NEELU KHATRI",
    img: "/neelu.png",
  },
];

export default function Team() {
  return (
    <div className="w-full">

      {/* 🔥 HERO SECTION LIKE screenshot */}
      <section className="relative h-[75vh] w-full flex items-center">
        {/* background image */}
        <img
          src="/team.jpg"   // make sure this hero image exists in /public/team/
          alt="Team"
          className="absolute inset-0 h-full w-full object-cover"
        />

        {/* purple overlay */}
        <div className="absolute inset-0 bg-purple-700/60 mix-blend-multiply"></div>

        {/* text content */}
        <div className="relative max-w-6xl mx-auto px-6 lg:px-12">
          <h1 className="text-5xl lg:text-6xl font-bold text-white max-w-[550px]">
            Our powerhouse team of experts and supporters
          </h1>
        </div>
      </section>

      {/* TEAM SECTION */}
      <section className="py-20">
        <h2 className="text-3xl font-semibold text-center mb-14">
          Our team
        </h2>

        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-12">
          {teamMembers.map((member, i) => (
            <div
              key={i}
              className="border-2 border-purple-600 rounded-xl overflow-hidden shadow-md hover:scale-105 transition duration-300"
            >
              <div className="p-4">
                <img
                  src={member.img}
                  alt={member.name}
                  className="w-full h-72 object-cover rounded-md"
                />
              </div>
              <div className="bg-purple-700 text-white text-center py-3 font-semibold">
                {member.name}
              </div>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
}
