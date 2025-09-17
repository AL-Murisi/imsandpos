// const config = {
//   plugins: {
//     "@tailwindcss/postcss": {},
//   },
// };

// export default config;
// const config = {
//   plugins: {
//     "@tailwindcss/postcss": {
//       // Enable optimizations for production
//       optimize: process.env.NODE_ENV === "production",
//       // Minify CSS in production
//       minify: process.env.NODE_ENV === "production",
//     },
//     autoprefixer: {},
//     // Add autoprefixer for better browser compatibility
//     ...(process.env.NODE_ENV === "production" && {
//       // Optional: Add cssnano for additional minification
//       cssnano: {},
//     }),
//
const config = {
  plugins: {
    "@tailwindcss/postcss": {
      // Enable optimizations for production
      // optimize: process.env.NODE_ENV === 'production',
      // // Minify CSS in production
      // minify: process.env.NODE_ENV === 'production',
    },
    autoprefixer: {},
    // Add autoprefixer for better browser compatibility
    ...(process.env.NODE_ENV === "production" && {
      // autoprefixer: {},
      // Optional: Add cssnano for additional minification
      cssnano: {
        preset: [
          "default",
          {
            // discardComments: {
            //   removeAll: true,
            // },
            normalizeWhitespace: true,
          },
        ],
      },
    }),
  },
};

export default config;
//   },
// };

// export default config;
