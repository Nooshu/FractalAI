/**
 * Fractal Information Data
 * Contains mathematical information for fractals displayed in the Mathematical Information Panel
 */

/**
 * Mathematical information for each fractal type
 */
export const FRACTAL_INFO = {
  mandelbrot: {
    name: 'Mandelbrot Set',
    family: 'mandelbrot-family',
    formulas: [
      {
        title: 'Iteration Formula',
        latex: 'z_{n+1} = z_n^2 + c',
        description: 'For each point c in the complex plane, iterate z starting from z₀ = 0. If the sequence remains bounded, c is in the Mandelbrot set.',
        plainText: 'z(n+1) = z(n)² + c'
      },
      {
        title: 'Escape Condition',
        latex: '|z_n| > 2',
        description: 'If |z_n| exceeds 2, the point escapes to infinity and is not in the set.',
        plainText: '|z(n)| > 2'
      }
    ],
    properties: {
      fractalDimension: '2.0 (boundary)',
      selfSimilar: true,
      discovered: '1980',
      discoverer: 'Benoit Mandelbrot',
      complexity: 'O(n²) per pixel',
      applications: ['Computer graphics', 'Chaos theory', 'Art', 'Education']
    },
    history: 'The Mandelbrot set was discovered by Benoit Mandelbrot in 1980 while studying the Julia sets. It is one of the most famous fractals and has become an icon of fractal geometry.',
    relatedFractals: [
      { type: 'julia', name: 'Julia Set', relationship: 'Connected set' },
      { type: 'multibrot', name: 'Multibrot Set', relationship: 'Generalization' },
      { type: 'burning-ship', name: 'Burning Ship', relationship: 'Variant' },
      { type: 'tricorn', name: 'Tricorn', relationship: 'Variant' }
    ]
  },

  julia: {
    name: 'Julia Set',
    family: 'julia-family',
    formulas: [
      {
        title: 'Iteration Formula',
        latex: 'z_{n+1} = z_n^2 + c',
        description: 'Same formula as Mandelbrot, but c is a fixed complex parameter and z₀ varies across the plane.',
        plainText: 'z(n+1) = z(n)² + c (c is fixed)'
      },
      {
        title: 'Connection to Mandelbrot',
        latex: 'J_c \\text{ is connected} \\iff c \\in M',
        description: 'A Julia set is connected if and only if its parameter c is in the Mandelbrot set.',
        plainText: 'Julia set is connected if and only if c is in Mandelbrot set'
      }
    ],
    properties: {
      fractalDimension: 'Varies (typically 1-2)',
      selfSimilar: true,
      discovered: '1918',
      discoverer: 'Gaston Julia',
      complexity: 'O(n²) per pixel',
      applications: ['Dynamical systems', 'Complex analysis', 'Art']
    },
    history: 'Discovered by French mathematician Gaston Julia in 1918, long before computers could visualize them. Julia sets were theoretical constructs until the computer age made them visible.',
    relatedFractals: [
      { type: 'mandelbrot', name: 'Mandelbrot Set', relationship: 'Connected set' },
      { type: 'multibrot-julia', name: 'Multibrot Julia', relationship: 'Generalization' },
      { type: 'phoenix-julia', name: 'Phoenix Julia', relationship: 'Variant' }
    ]
  },

  sierpinski: {
    name: 'Sierpinski Triangle',
    family: 'sierpinski-family',
    formulas: [
      {
        title: 'Construction',
        description: 'Start with an equilateral triangle. Remove the inverted triangle in the middle. Repeat this process for each remaining triangle infinitely.',
        plainText: 'Recursive removal of middle triangles'
      },
      {
        title: 'Fractal Dimension',
        latex: 'D = \\frac{\\log(3)}{\\log(2)} \\approx 1.585',
        description: 'Hausdorff dimension: log(number of copies) / log(scaling factor)',
        plainText: 'D = log(3)/log(2) ≈ 1.585'
      },
      {
        title: 'Area',
        latex: 'A_n = A_0 \\left(\\frac{3}{4}\\right)^n',
        description: 'Area approaches zero as iterations increase',
        plainText: 'A(n) = A(0) * (3/4)^n'
      }
    ],
    properties: {
      fractalDimension: 'log(3)/log(2) ≈ 1.585',
      selfSimilar: true,
      discovered: '1915',
      discoverer: 'Wacław Sierpiński',
      complexity: 'O(3^n) for n iterations',
      applications: ['Geometry', 'Education', 'Art', 'Antennas']
    },
    history: 'Named after Polish mathematician Wacław Sierpiński who described it in 1915. It is one of the earliest and simplest examples of a fractal.',
    relatedFractals: [
      { type: 'sierpinski-carpet', name: 'Sierpinski Carpet', relationship: '2D variant' },
      { type: 'sierpinski-gasket', name: 'Sierpinski Gasket', relationship: 'Same fractal' },
      { type: 'koch', name: 'Koch Snowflake', relationship: 'Similar construction' },
      { type: 'cantor', name: 'Cantor Set', relationship: '1D analog' }
    ]
  },

  koch: {
    name: 'Koch Snowflake',
    family: 'koch-family',
    formulas: [
      {
        title: 'Construction',
        description: 'Start with an equilateral triangle. Replace each side with a "bump" made of 4 segments. Repeat for each new segment.',
        plainText: 'Replace each line segment with a 4-segment bump'
      },
      {
        title: 'Fractal Dimension',
        latex: 'D = \\frac{\\log(4)}{\\log(3)} \\approx 1.262',
        description: 'Each iteration creates 4 copies scaled by 1/3',
        plainText: 'D = log(4)/log(3) ≈ 1.262'
      },
      {
        title: 'Perimeter',
        latex: 'P_n = P_0 \\left(\\frac{4}{3}\\right)^n',
        description: 'Perimeter grows without bound, approaching infinity',
        plainText: 'P(n) = P(0) * (4/3)^n'
      }
    ],
    properties: {
      fractalDimension: 'log(4)/log(3) ≈ 1.262',
      selfSimilar: true,
      discovered: '1904',
      discoverer: 'Helge von Koch',
      complexity: 'O(4^n) for n iterations',
      applications: ['Nowhere differentiable curves', 'Coastline modeling', 'Education']
    },
    history: 'Discovered by Swedish mathematician Helge von Koch in 1904. It was one of the first examples of a curve that is continuous everywhere but differentiable nowhere.',
    relatedFractals: [
      { type: 'sierpinski', name: 'Sierpinski Triangle', relationship: 'Similar recursive construction' },
      { type: 'quadratic-koch', name: 'Quadratic Koch', relationship: 'Variant' }
    ]
  },

  // Mandelbrot Family Variants
  'celtic-mandelbrot': {
    name: 'Celtic Mandelbrot',
    family: 'mandelbrot-family',
    formulas: [
      {
        title: 'Iteration Formula',
        latex: 'z_{n+1} = (|\\text{Re}(z_n)| + i|\\text{Im}(z_n)|)^2 + c',
        description: 'Uses absolute values of real and imaginary parts before squaring, creating a distinctive Celtic knot-like pattern.',
        plainText: 'z(n+1) = (|Re(z(n))| + i|Im(z(n))|)² + c'
      }
    ],
    properties: {
      fractalDimension: '2.0 (boundary)',
      selfSimilar: true,
      discovered: '2001',
      discoverer: 'Fractal community',
      complexity: 'O(n²) per pixel',
      applications: ['Art', 'Computer graphics']
    },
    history: 'A variant of the Mandelbrot set discovered in the early 2000s. The use of absolute values creates symmetric, knot-like patterns reminiscent of Celtic art.',
    relatedFractals: [
      { type: 'mandelbrot', name: 'Mandelbrot Set', relationship: 'Base fractal' },
      { type: 'burning-ship', name: 'Burning Ship', relationship: 'Similar variant' }
    ]
  },

  multibrot: {
    name: 'Multibrot Set',
    family: 'mandelbrot-family',
    formulas: [
      {
        title: 'Iteration Formula',
        latex: 'z_{n+1} = z_n^d + c',
        description: 'Generalization of Mandelbrot set where d is the power (typically d > 2). The classic Mandelbrot uses d = 2.',
        plainText: 'z(n+1) = z(n)^d + c'
      }
    ],
    properties: {
      fractalDimension: '2.0 (boundary)',
      selfSimilar: true,
      discovered: '1980s',
      discoverer: 'Fractal community',
      complexity: 'O(n²) per pixel',
      applications: ['Mathematical visualization', 'Art']
    },
    history: 'A generalization of the Mandelbrot set where the iteration uses higher powers. As the power increases, the set becomes more circular and symmetric.',
    relatedFractals: [
      { type: 'mandelbrot', name: 'Mandelbrot Set', relationship: 'Special case (d=2)' },
      { type: 'multibrot-julia', name: 'Multibrot Julia', relationship: 'Julia variant' }
    ]
  },

  'mutant-mandelbrot': {
    name: 'Mutant Mandelbrot',
    family: 'mandelbrot-family',
    formulas: [
      {
        title: 'Iteration Formula',
        latex: 'z_{n+1} = z_n^2 + c + \\epsilon',
        description: 'A perturbed version of the Mandelbrot set with a small constant offset ε, creating "mutant" variations.',
        plainText: 'z(n+1) = z(n)² + c + ε'
      }
    ],
    properties: {
      fractalDimension: '2.0 (boundary)',
      selfSimilar: true,
      discovered: '1990s',
      discoverer: 'Fractal community',
      complexity: 'O(n²) per pixel',
      applications: ['Art', 'Mathematical exploration']
    },
    history: 'A variant of the Mandelbrot set with a small perturbation term, creating interesting variations while maintaining the overall structure.',
    relatedFractals: [
      { type: 'mandelbrot', name: 'Mandelbrot Set', relationship: 'Base fractal' }
    ]
  },

  'phoenix-mandelbrot': {
    name: 'Phoenix Mandelbrot',
    family: 'mandelbrot-family',
    formulas: [
      {
        title: 'Iteration Formula',
        latex: 'z_{n+1} = z_n^2 + c + p \\cdot z_{n-1}',
        description: 'Uses the previous iteration value, creating a "memory" effect that produces phoenix-like patterns.',
        plainText: 'z(n+1) = z(n)² + c + p * z(n-1)'
      }
    ],
    properties: {
      fractalDimension: '2.0 (boundary)',
      selfSimilar: true,
      discovered: '1990s',
      discoverer: 'Fractal community',
      complexity: 'O(n²) per pixel',
      applications: ['Art', 'Dynamical systems']
    },
    history: 'Named for its phoenix-like appearance, this fractal uses a two-step iteration that creates distinctive spiral and flame patterns.',
    relatedFractals: [
      { type: 'mandelbrot', name: 'Mandelbrot Set', relationship: 'Base fractal' },
      { type: 'phoenix-julia', name: 'Phoenix Julia', relationship: 'Julia variant' }
    ]
  },

  'burning-ship': {
    name: 'Burning Ship',
    family: 'mandelbrot-family',
    formulas: [
      {
        title: 'Iteration Formula',
        latex: 'z_{n+1} = (|\\text{Re}(z_n)| + i|\\text{Im}(z_n)|)^2 + c',
        description: 'Uses absolute values before squaring, creating a ship-like structure that appears to be "burning".',
        plainText: 'z(n+1) = (|Re(z(n))| + i|Im(z(n))|)² + c'
      }
    ],
    properties: {
      fractalDimension: '2.0 (boundary)',
      selfSimilar: true,
      discovered: '1992',
      discoverer: 'Michael Michelitsch and Otto Rössler',
      complexity: 'O(n²) per pixel',
      applications: ['Art', 'Computer graphics']
    },
    history: 'Discovered in 1992, the Burning Ship fractal gets its name from its distinctive shape that resembles a ship on fire. It uses absolute values in the iteration formula.',
    relatedFractals: [
      { type: 'mandelbrot', name: 'Mandelbrot Set', relationship: 'Base fractal' },
      { type: 'burning-ship-julia', name: 'Burning Ship Julia', relationship: 'Julia variant' },
      { type: 'celtic-mandelbrot', name: 'Celtic Mandelbrot', relationship: 'Similar variant' }
    ]
  },

  tricorn: {
    name: 'Tricorn',
    family: 'mandelbrot-family',
    formulas: [
      {
        title: 'Iteration Formula',
        latex: 'z_{n+1} = \\bar{z}_n^2 + c',
        description: 'Uses the complex conjugate of z before squaring, creating a three-cornered (tricorn) shape.',
        plainText: 'z(n+1) = conjugate(z(n))² + c'
      }
    ],
    properties: {
      fractalDimension: '2.0 (boundary)',
      selfSimilar: true,
      discovered: '1990s',
      discoverer: 'Fractal community',
      complexity: 'O(n²) per pixel',
      applications: ['Art', 'Mathematical visualization']
    },
    history: 'The Tricorn (also known as the Mandelbar set) uses complex conjugation, creating a symmetric three-cornered structure. It is the complex conjugate of the Mandelbrot set.',
    relatedFractals: [
      { type: 'mandelbrot', name: 'Mandelbrot Set', relationship: 'Conjugate variant' },
      { type: 'tricorn-julia', name: 'Tricorn Julia', relationship: 'Julia variant' }
    ]
  },

  nebulabrot: {
    name: 'Nebulabrot',
    family: 'mandelbrot-family',
    formulas: [
      {
        title: 'Rendering Method',
        description: 'Tracks the trajectory of points that escape the Mandelbrot set, accumulating their paths to create nebula-like effects.',
        plainText: 'Accumulates escape trajectories'
      },
      {
        title: 'Escape Time',
        latex: 't = \\min\\{n : |z_n| > 2\\}',
        description: 'Records the iteration at which each point escapes.',
        plainText: 't = min{n : |z(n)| > 2}'
      }
    ],
    properties: {
      fractalDimension: 'N/A (rendering technique)',
      selfSimilar: false,
      discovered: '1990s',
      discoverer: 'Fractal community',
      complexity: 'O(n²) per pixel',
      applications: ['Art', 'Visualization']
    },
    history: 'A rendering technique for the Mandelbrot set that visualizes the paths of escaping points, creating beautiful nebula-like patterns. Related to Buddhabrot.',
    relatedFractals: [
      { type: 'mandelbrot', name: 'Mandelbrot Set', relationship: 'Rendering technique' },
      { type: 'buddhabrot', name: 'Buddhabrot', relationship: 'Similar technique' }
    ]
  },

  buddhabrot: {
    name: 'Buddhabrot',
    family: 'mandelbrot-family',
    formulas: [
      {
        title: 'Rendering Method',
        description: 'Tracks and accumulates the trajectories of points that escape the Mandelbrot set, creating a silhouette resembling a meditating Buddha.',
        plainText: 'Accumulates escape trajectories'
      },
      {
        title: 'Probability Distribution',
        latex: 'P(z) = \\sum_{\\text{escapes through } z} 1',
        description: 'Counts how many escaping trajectories pass through each point.',
        plainText: 'P(z) = sum of trajectories through z'
      }
    ],
    properties: {
      fractalDimension: 'N/A (rendering technique)',
      selfSimilar: false,
      discovered: '1993',
      discoverer: 'Melinda Green',
      complexity: 'O(n²) per pixel',
      applications: ['Art', 'Visualization']
    },
    history: 'Discovered by Melinda Green in 1993, Buddhabrot is a rendering technique that accumulates the paths of escaping points, creating a silhouette that resembles a meditating Buddha.',
    relatedFractals: [
      { type: 'mandelbrot', name: 'Mandelbrot Set', relationship: 'Rendering technique' },
      { type: 'nebulabrot', name: 'Nebulabrot', relationship: 'Similar technique' }
    ]
  },

  // Julia Set Variants
  'julia-snakes': {
    name: 'Julia Snakes',
    family: 'julia-family',
    formulas: [
      {
        title: 'Iteration Formula',
        latex: 'z_{n+1} = z_n^2 + c',
        description: 'Standard Julia iteration with specific parameter values that create snake-like patterns.',
        plainText: 'z(n+1) = z(n)² + c'
      }
    ],
    properties: {
      fractalDimension: 'Varies (typically 1-2)',
      selfSimilar: true,
      discovered: '1918',
      discoverer: 'Gaston Julia',
      complexity: 'O(n²) per pixel',
      applications: ['Art', 'Dynamical systems']
    },
    history: 'A Julia set variant that produces distinctive snake-like patterns when viewed at certain parameter values.',
    relatedFractals: [
      { type: 'julia', name: 'Julia Set', relationship: 'Base fractal' }
    ]
  },

  'multibrot-julia': {
    name: 'Multibrot Julia Sets',
    family: 'julia-family',
    formulas: [
      {
        title: 'Iteration Formula',
        latex: 'z_{n+1} = z_n^d + c',
        description: 'Julia set variant using higher powers d, where c is fixed and z₀ varies.',
        plainText: 'z(n+1) = z(n)^d + c (c fixed)'
      }
    ],
    properties: {
      fractalDimension: 'Varies (typically 1-2)',
      selfSimilar: true,
      discovered: '1980s',
      discoverer: 'Fractal community',
      complexity: 'O(n²) per pixel',
      applications: ['Mathematical visualization', 'Art']
    },
    history: 'Generalization of Julia sets using higher powers, creating more circular and symmetric patterns as the power increases.',
    relatedFractals: [
      { type: 'julia', name: 'Julia Set', relationship: 'Base fractal' },
      { type: 'multibrot', name: 'Multibrot Set', relationship: 'Mandelbrot variant' }
    ]
  },

  'burning-ship-julia': {
    name: 'Burning Ship Julia Set',
    family: 'julia-family',
    formulas: [
      {
        title: 'Iteration Formula',
        latex: 'z_{n+1} = (|\\text{Re}(z_n)| + i|\\text{Im}(z_n)|)^2 + c',
        description: 'Julia set variant using absolute values before squaring, with fixed parameter c.',
        plainText: 'z(n+1) = (|Re(z(n))| + i|Im(z(n))|)² + c (c fixed)'
      }
    ],
    properties: {
      fractalDimension: 'Varies',
      selfSimilar: true,
      discovered: '1992',
      discoverer: 'Michael Michelitsch and Otto Rössler',
      complexity: 'O(n²) per pixel',
      applications: ['Art', 'Computer graphics']
    },
    history: 'The Julia set variant of the Burning Ship fractal, using absolute values in the iteration formula.',
    relatedFractals: [
      { type: 'julia', name: 'Julia Set', relationship: 'Base fractal' },
      { type: 'burning-ship', name: 'Burning Ship', relationship: 'Mandelbrot variant' }
    ]
  },

  'tricorn-julia': {
    name: 'Tricorn Julia Set',
    family: 'julia-family',
    formulas: [
      {
        title: 'Iteration Formula',
        latex: 'z_{n+1} = \\bar{z}_n^2 + c',
        description: 'Julia set variant using complex conjugation before squaring, with fixed parameter c.',
        plainText: 'z(n+1) = conjugate(z(n))² + c (c fixed)'
      }
    ],
    properties: {
      fractalDimension: 'Varies',
      selfSimilar: true,
      discovered: '1990s',
      discoverer: 'Fractal community',
      complexity: 'O(n²) per pixel',
      applications: ['Art', 'Mathematical visualization']
    },
    history: 'The Julia set variant of the Tricorn, using complex conjugation in the iteration formula.',
    relatedFractals: [
      { type: 'julia', name: 'Julia Set', relationship: 'Base fractal' },
      { type: 'tricorn', name: 'Tricorn', relationship: 'Mandelbrot variant' }
    ]
  },

  'phoenix-julia': {
    name: 'Phoenix Julia Set',
    family: 'julia-family',
    formulas: [
      {
        title: 'Iteration Formula',
        latex: 'z_{n+1} = z_n^2 + c + p \\cdot z_{n-1}',
        description: 'Julia set variant with memory term, using fixed parameter c.',
        plainText: 'z(n+1) = z(n)² + c + p * z(n-1) (c fixed)'
      }
    ],
    properties: {
      fractalDimension: 'Varies',
      selfSimilar: true,
      discovered: '1990s',
      discoverer: 'Fractal community',
      complexity: 'O(n²) per pixel',
      applications: ['Art', 'Dynamical systems']
    },
    history: 'The Julia set variant of the Phoenix fractal, creating distinctive spiral patterns with a memory term.',
    relatedFractals: [
      { type: 'julia', name: 'Julia Set', relationship: 'Base fractal' },
      { type: 'phoenix-mandelbrot', name: 'Phoenix Mandelbrot', relationship: 'Mandelbrot variant' }
    ]
  },

  'lambda-julia': {
    name: 'Lambda Julia Set',
    family: 'julia-family',
    formulas: [
      {
        title: 'Iteration Formula',
        latex: 'z_{n+1} = \\lambda z_n(1 - z_n)',
        description: 'Uses the logistic map iteration with complex parameter λ, creating Julia-like structures.',
        plainText: 'z(n+1) = λ * z(n) * (1 - z(n))'
      }
    ],
    properties: {
      fractalDimension: 'Varies',
      selfSimilar: true,
      discovered: '1980s',
      discoverer: 'Fractal community',
      complexity: 'O(n²) per pixel',
      applications: ['Chaos theory', 'Dynamical systems']
    },
    history: 'Based on the logistic map, a fundamental equation in chaos theory. The parameter λ controls the behavior, creating Julia-like fractal structures.',
    relatedFractals: [
      { type: 'julia', name: 'Julia Set', relationship: 'Related structure' }
    ]
  },

  'hybrid-julia': {
    name: 'Hybrid Julia Set',
    family: 'julia-family',
    formulas: [
      {
        title: 'Iteration Formula',
        description: 'Combines multiple iteration formulas or uses hybrid approaches to create unique patterns.',
        plainText: 'Hybrid iteration formula'
      }
    ],
    properties: {
      fractalDimension: 'Varies',
      selfSimilar: true,
      discovered: '1990s',
      discoverer: 'Fractal community',
      complexity: 'O(n²) per pixel',
      applications: ['Art', 'Mathematical exploration']
    },
    history: 'A hybrid approach combining different iteration formulas to create unique Julia set variants.',
    relatedFractals: [
      { type: 'julia', name: 'Julia Set', relationship: 'Base fractal' }
    ]
  },

  'pickover-stalks': {
    name: 'Pickover Stalks',
    family: 'julia-family',
    formulas: [
      {
        title: 'Rendering Method',
        description: 'Visualizes the trajectory of points in the Julia set, highlighting regions where points come close to the real or imaginary axes.',
        plainText: 'Trajectory visualization'
      }
    ],
    properties: {
      fractalDimension: 'N/A (rendering technique)',
      selfSimilar: false,
      discovered: '1980s',
      discoverer: 'Clifford Pickover',
      complexity: 'O(n²) per pixel',
      applications: ['Visualization', 'Art']
    },
    history: 'Named after Clifford Pickover, this rendering technique highlights the paths of iterated points, creating stalk-like patterns.',
    relatedFractals: [
      { type: 'julia', name: 'Julia Set', relationship: 'Rendering technique' }
    ]
  },

  biomorphs: {
    name: 'Biomorphs',
    family: 'julia-family',
    formulas: [
      {
        title: 'Iteration Formula',
        latex: 'z_{n+1} = z_n^d + c',
        description: 'Uses escape-time algorithm but with biological-looking termination conditions, creating life-like forms.',
        plainText: 'z(n+1) = z(n)^d + c'
      }
    ],
    properties: {
      fractalDimension: 'Varies',
      selfSimilar: true,
      discovered: '1986',
      discoverer: 'Clifford Pickover',
      complexity: 'O(n²) per pixel',
      applications: ['Art', 'Biological modeling']
    },
    history: 'Discovered by Clifford Pickover in 1986, biomorphs are fractals that resemble biological organisms. They use modified escape conditions to create life-like forms.',
    relatedFractals: [
      { type: 'julia', name: 'Julia Set', relationship: 'Related structure' }
    ]
  },

  // Sierpinski Family Variants
  'sierpinski-carpet': {
    name: 'Sierpinski Carpet',
    family: 'sierpinski-family',
    formulas: [
      {
        title: 'Construction',
        description: 'Start with a square. Divide into 9 equal squares and remove the center. Repeat for each remaining square.',
        plainText: 'Recursive removal of center squares'
      },
      {
        title: 'Fractal Dimension',
        latex: 'D = \\frac{\\log(8)}{\\log(3)} \\approx 1.893',
        description: 'Each iteration creates 8 copies scaled by 1/3',
        plainText: 'D = log(8)/log(3) ≈ 1.893'
      }
    ],
    properties: {
      fractalDimension: 'log(8)/log(3) ≈ 1.893',
      selfSimilar: true,
      discovered: '1916',
      discoverer: 'Wacław Sierpiński',
      complexity: 'O(8^n) for n iterations',
      applications: ['Geometry', 'Education', 'Art']
    },
    history: 'Described by Wacław Sierpiński in 1916, the carpet is the 2D analog of the Cantor set. It has zero area but infinite perimeter.',
    relatedFractals: [
      { type: 'sierpinski', name: 'Sierpinski Triangle', relationship: 'Related fractal' },
      { type: 'cantor', name: 'Cantor Set', relationship: '1D analog' }
    ]
  },

  'sierpinski-arrowhead': {
    name: 'Sierpinski Arrowhead Curve',
    family: 'sierpinski-family',
    formulas: [
      {
        title: 'Construction',
        description: 'A space-filling curve that creates the Sierpinski triangle through a continuous path.',
        plainText: 'Space-filling curve construction'
      }
    ],
    properties: {
      fractalDimension: 'log(3)/log(2) ≈ 1.585',
      selfSimilar: true,
      discovered: '1915',
      discoverer: 'Wacław Sierpiński',
      complexity: 'O(3^n) for n iterations',
      applications: ['Geometry', 'Space-filling curves']
    },
    history: 'A space-filling curve that traces out the Sierpinski triangle, providing a continuous path through the fractal structure.',
    relatedFractals: [
      { type: 'sierpinski', name: 'Sierpinski Triangle', relationship: 'Same fractal' },
      { type: 'hilbert-curve', name: 'Hilbert Curve', relationship: 'Space-filling curve' }
    ]
  },

  'sierpinski-gasket': {
    name: 'Generalised Sierpinski Gasket',
    family: 'sierpinski-family',
    formulas: [
      {
        title: 'Construction',
        description: 'Generalization of the Sierpinski triangle using different polygon shapes or scaling factors.',
        plainText: 'Generalized recursive construction'
      }
    ],
    properties: {
      fractalDimension: 'Varies',
      selfSimilar: true,
      discovered: '1915',
      discoverer: 'Wacław Sierpiński',
      complexity: 'O(k^n) for n iterations',
      applications: ['Geometry', 'Mathematical exploration']
    },
    history: 'A generalization of the classic Sierpinski triangle, allowing for different polygon shapes and scaling factors.',
    relatedFractals: [
      { type: 'sierpinski', name: 'Sierpinski Triangle', relationship: 'Base fractal' }
    ]
  },

  'sierpinski-hexagon': {
    name: 'Sierpinski Hexagon',
    family: 'sierpinski-family',
    formulas: [
      {
        title: 'Construction',
        description: 'Start with a regular hexagon. Divide into smaller hexagons and remove some according to a pattern. Repeat.',
        plainText: 'Recursive hexagon subdivision'
      }
    ],
    properties: {
      fractalDimension: 'Varies',
      selfSimilar: true,
      discovered: '1915',
      discoverer: 'Wacław Sierpiński',
      complexity: 'O(k^n) for n iterations',
      applications: ['Geometry', 'Art']
    },
    history: 'A hexagonal variant of the Sierpinski triangle, using hexagons instead of triangles in the recursive construction.',
    relatedFractals: [
      { type: 'sierpinski', name: 'Sierpinski Triangle', relationship: 'Base fractal' }
    ]
  },

  'sierpinski-pentagon': {
    name: 'Sierpinski Pentagon',
    family: 'sierpinski-family',
    formulas: [
      {
        title: 'Construction',
        description: 'Start with a regular pentagon. Subdivide and remove sections recursively to create a fractal pattern.',
        plainText: 'Recursive pentagon subdivision'
      }
    ],
    properties: {
      fractalDimension: 'Varies',
      selfSimilar: true,
      discovered: '1915',
      discoverer: 'Wacław Sierpiński',
      complexity: 'O(k^n) for n iterations',
      applications: ['Geometry', 'Art']
    },
    history: 'A pentagonal variant of the Sierpinski triangle, demonstrating the fractal concept with five-fold symmetry.',
    relatedFractals: [
      { type: 'sierpinski', name: 'Sierpinski Triangle', relationship: 'Base fractal' }
    ]
  },

  'menger-carpet': {
    name: 'Menger Carpet',
    family: 'sierpinski-family',
    formulas: [
      {
        title: 'Construction',
        description: '3D generalization of the Sierpinski carpet. Start with a cube, divide into 27 smaller cubes, remove center and face centers. Repeat.',
        plainText: '3D recursive cube removal'
      },
      {
        title: 'Fractal Dimension',
        latex: 'D = \\frac{\\log(20)}{\\log(3)} \\approx 2.727',
        description: 'Each iteration creates 20 copies scaled by 1/3',
        plainText: 'D = log(20)/log(3) ≈ 2.727'
      }
    ],
    properties: {
      fractalDimension: 'log(20)/log(3) ≈ 2.727',
      selfSimilar: true,
      discovered: '1926',
      discoverer: 'Karl Menger',
      complexity: 'O(20^n) for n iterations',
      applications: ['Geometry', 'Topology', 'Art']
    },
    history: 'Discovered by Karl Menger in 1926, the Menger sponge (2D projection shown as carpet) is a 3D fractal with fascinating topological properties.',
    relatedFractals: [
      { type: 'sierpinski-carpet', name: 'Sierpinski Carpet', relationship: '2D analog' },
      { type: 'menger-sponge', name: 'Menger Sponge', relationship: '3D version' }
    ]
  },

  // Cantor Family
  cantor: {
    name: 'Cantor Set',
    family: 'cantor-family',
    formulas: [
      {
        title: 'Construction',
        description: 'Start with the interval [0,1]. Remove the middle third. Repeat for each remaining interval infinitely.',
        plainText: 'Recursive removal of middle thirds'
      },
      {
        title: 'Fractal Dimension',
        latex: 'D = \\frac{\\log(2)}{\\log(3)} \\approx 0.631',
        description: 'Each iteration creates 2 copies scaled by 1/3',
        plainText: 'D = log(2)/log(3) ≈ 0.631'
      },
      {
        title: 'Length',
        latex: 'L_n = \\left(\\frac{2}{3}\\right)^n',
        description: 'Total length approaches zero as n increases',
        plainText: 'L(n) = (2/3)^n'
      }
    ],
    properties: {
      fractalDimension: 'log(2)/log(3) ≈ 0.631',
      selfSimilar: true,
      discovered: '1883',
      discoverer: 'Georg Cantor',
      complexity: 'O(2^n) for n iterations',
      applications: ['Set theory', 'Measure theory', 'Topology', 'Education']
    },
    history: 'Discovered by Georg Cantor in 1883, the Cantor set is one of the earliest fractals. It has zero length but uncountably many points, challenging intuitive notions of size.',
    relatedFractals: [
      { type: 'sierpinski', name: 'Sierpinski Triangle', relationship: '2D analog' },
      { type: 'fat-cantor', name: 'Fat Cantor Set', relationship: 'Variant' }
    ]
  },

  'fat-cantor': {
    name: 'Fat Cantor Set',
    family: 'cantor-family',
    formulas: [
      {
        title: 'Construction',
        description: 'Similar to Cantor set but removes smaller middle portions, preserving positive measure (length).',
        plainText: 'Cantor set with positive measure'
      }
    ],
    properties: {
      fractalDimension: '1.0',
      selfSimilar: true,
      discovered: '1880s',
      discoverer: 'Henry Smith',
      complexity: 'O(2^n) for n iterations',
      applications: ['Measure theory', 'Topology']
    },
    history: 'Also known as the Smith-Volterra-Cantor set, discovered in the 1880s. Unlike the standard Cantor set, it has positive measure while still being nowhere dense.',
    relatedFractals: [
      { type: 'cantor', name: 'Cantor Set', relationship: 'Base fractal' },
      { type: 'smith-volterra-cantor', name: 'Smith-Volterra-Cantor Set', relationship: 'Same fractal' }
    ]
  },

  'smith-volterra-cantor': {
    name: 'Smith-Volterra-Cantor Set',
    family: 'cantor-family',
    formulas: [
      {
        title: 'Construction',
        description: 'A Cantor-like set with positive measure, constructed by removing progressively smaller middle portions.',
        plainText: 'Cantor set with positive measure'
      }
    ],
    properties: {
      fractalDimension: '1.0',
      selfSimilar: true,
      discovered: '1880s',
      discoverer: 'Henry Smith and Vito Volterra',
      complexity: 'O(2^n) for n iterations',
      applications: ['Measure theory', 'Topology']
    },
    history: 'Discovered independently by Henry Smith and Vito Volterra in the 1880s. It demonstrates that a set can be nowhere dense yet have positive measure.',
    relatedFractals: [
      { type: 'cantor', name: 'Cantor Set', relationship: 'Base fractal' },
      { type: 'fat-cantor', name: 'Fat Cantor Set', relationship: 'Same fractal' }
    ]
  },

  // Dragon Curves
  'heighway-dragon': {
    name: 'Heighway Dragon',
    family: 'dragon-family',
    formulas: [
      {
        title: 'Construction',
        description: 'Fold a strip of paper in half repeatedly, then unfold with 90° angles. The limit curve is the dragon curve.',
        plainText: 'Paper folding construction'
      },
      {
        title: 'Fractal Dimension',
        latex: 'D = 2',
        description: 'The dragon curve is space-filling in the limit',
        plainText: 'D = 2 (space-filling)'
      }
    ],
    properties: {
      fractalDimension: '2.0 (space-filling)',
      selfSimilar: true,
      discovered: '1966',
      discoverer: 'John Heighway',
      complexity: 'O(2^n) for n iterations',
      applications: ['Geometry', 'Art', 'Education']
    },
    history: 'Discovered by NASA physicist John Heighway in 1966 while folding paper. It was later studied by William Harter and Bruce Banks.',
    relatedFractals: [
      { type: 'twindragon', name: 'Twindragon', relationship: 'Related curve' },
      { type: 'terdragon', name: 'Terdragon', relationship: 'Related curve' }
    ]
  },

  'hilbert-curve': {
    name: 'Hilbert Curve',
    family: 'space-filling-family',
    formulas: [
      {
        title: 'Construction',
        description: 'A continuous space-filling curve that visits every point in a square. Each iteration subdivides the square into 4 smaller squares.',
        plainText: 'Recursive space-filling construction'
      },
      {
        title: 'Fractal Dimension',
        latex: 'D = 2',
        description: 'The curve is space-filling, covering the entire 2D square',
        plainText: 'D = 2 (space-filling)'
      }
    ],
    properties: {
      fractalDimension: '2.0 (space-filling)',
      selfSimilar: true,
      discovered: '1891',
      discoverer: 'David Hilbert',
      complexity: 'O(4^n) for n iterations',
      applications: ['Data structures', 'Image processing', 'Database indexing']
    },
    history: 'Discovered by German mathematician David Hilbert in 1891. It was one of the first space-filling curves, providing a continuous mapping from 1D to 2D.',
    relatedFractals: [
      { type: 'peano-curve', name: 'Peano Curve', relationship: 'Space-filling curve' },
      { type: 'moore-curve', name: 'Moore Curve', relationship: 'Space-filling curve' }
    ]
  },

  'peano-curve': {
    name: 'Peano Curve',
    family: 'space-filling-family',
    formulas: [
      {
        title: 'Construction',
        description: 'The first space-filling curve discovered, mapping the unit interval onto the unit square continuously.',
        plainText: 'First space-filling curve'
      },
      {
        title: 'Fractal Dimension',
        latex: 'D = 2',
        description: 'Space-filling curve covering the entire square',
        plainText: 'D = 2 (space-filling)'
      }
    ],
    properties: {
      fractalDimension: '2.0 (space-filling)',
      selfSimilar: true,
      discovered: '1890',
      discoverer: 'Giuseppe Peano',
      complexity: 'O(9^n) for n iterations',
      applications: ['Topology', 'Mathematical foundations']
    },
    history: 'Discovered by Italian mathematician Giuseppe Peano in 1890, this was the first space-filling curve, challenging intuitive notions of dimension.',
    relatedFractals: [
      { type: 'hilbert-curve', name: 'Hilbert Curve', relationship: 'Space-filling curve' }
    ]
  },

  // Root-Finding Fractals
  newton: {
    name: 'Newton Fractal',
    family: 'root-finding-family',
    formulas: [
      {
        title: 'Newton\'s Method',
        latex: 'z_{n+1} = z_n - \\frac{f(z_n)}{f\'(z_n)}',
        description: 'Iterative method for finding roots of a polynomial. Colors indicate which root each starting point converges to.',
        plainText: 'z(n+1) = z(n) - f(z(n))/f\'(z(n))'
      },
      {
        title: 'Example: Cubic Roots',
        latex: 'f(z) = z^3 - 1',
        description: 'Finding the three cube roots of unity creates beautiful fractal basins of attraction.',
        plainText: 'f(z) = z³ - 1'
      }
    ],
    properties: {
      fractalDimension: 'Varies',
      selfSimilar: true,
      discovered: '1879',
      discoverer: 'Arthur Cayley',
      complexity: 'O(n²) per pixel',
      applications: ['Numerical analysis', 'Root finding', 'Art']
    },
    history: 'First studied by Arthur Cayley in 1879, who investigated Newton\'s method for finding roots of polynomials. The fractal nature was discovered with computer visualization.',
    relatedFractals: [
      { type: 'halley', name: 'Halley Fractal', relationship: 'Related method' },
      { type: 'nova', name: 'Nova Fractal', relationship: 'Variant' }
    ]
  },

  halley: {
    name: 'Halley Fractal',
    family: 'root-finding-family',
    formulas: [
      {
        title: 'Halley\'s Method',
        latex: 'z_{n+1} = z_n - \\frac{2f(z_n)f\'(z_n)}{2[f\'(z_n)]^2 - f(z_n)f\'\'(z_n)}',
        description: 'A higher-order root-finding method that converges faster than Newton\'s method.',
        plainText: 'Halley\'s iterative root-finding formula'
      }
    ],
    properties: {
      fractalDimension: 'Varies',
      selfSimilar: true,
      discovered: '1694',
      discoverer: 'Edmond Halley',
      complexity: 'O(n²) per pixel',
      applications: ['Numerical analysis', 'Root finding']
    },
    history: 'Halley\'s method was developed by Edmond Halley (of Halley\'s Comet fame) in 1694. The fractal visualization shows the basins of attraction for polynomial roots.',
    relatedFractals: [
      { type: 'newton', name: 'Newton Fractal', relationship: 'Related method' }
    ]
  },

  // Plant and Tree Families
  'barnsley-fern': {
    name: 'Barnsley Fern',
    family: 'plant-family',
    formulas: [
      {
        title: 'Iterated Function System',
        latex: 'f_i(x, y) = \\begin{pmatrix} a_i & b_i \\\\ c_i & d_i \\end{pmatrix} \\begin{pmatrix} x \\\\ y \\end{pmatrix} + \\begin{pmatrix} e_i \\\\ f_i \\end{pmatrix}',
        description: 'Uses 4 affine transformations with probabilities to generate the fern shape.',
        plainText: 'IFS with 4 affine transformations'
      }
    ],
    properties: {
      fractalDimension: '≈ 1.7',
      selfSimilar: true,
      discovered: '1988',
      discoverer: 'Michael Barnsley',
      complexity: 'O(n) for n points',
      applications: ['Computer graphics', 'Fractal compression', 'Art']
    },
    history: 'Created by Michael Barnsley in 1988 as an example of an iterated function system (IFS). It demonstrates how simple rules can create complex, natural-looking forms.',
    relatedFractals: [
      { type: 'plant', name: 'Plant', relationship: 'IFS fractal' },
      { type: 'fractal-tree', name: 'Fractal Tree', relationship: 'Plant-like structure' }
    ]
  },

  'pythagoras-tree': {
    name: 'Pythagoras Tree',
    family: 'tree-family',
    formulas: [
      {
        title: 'Construction',
        description: 'Start with a square. Attach two smaller squares to one side, forming a right triangle. Repeat recursively.',
        plainText: 'Recursive square attachment using Pythagorean theorem'
      }
    ],
    properties: {
      fractalDimension: '2.0',
      selfSimilar: true,
      discovered: '1942',
      discoverer: 'Albert E. Bosman',
      complexity: 'O(2^n) for n iterations',
      applications: ['Education', 'Art', 'Geometry']
    },
    history: 'Created by Dutch mathematics teacher Albert E. Bosman in 1942. It visually demonstrates the Pythagorean theorem through recursive construction.',
    relatedFractals: [
      { type: 'binary-fractal-tree', name: 'Binary Fractal Tree', relationship: 'Tree structure' }
    ]
  },

  // Geometric Family
  'apollonian-gasket': {
    name: 'Apollonian Gasket',
    family: 'geometric-family',
    formulas: [
      {
        title: 'Descartes Circle Theorem',
        latex: '2(\\kappa_1^2 + \\kappa_2^2 + \\kappa_3^2 + \\kappa_4^2) = (\\kappa_1 + \\kappa_2 + \\kappa_3 + \\kappa_4)^2',
        description: 'Relates the curvatures of four mutually tangent circles, where κ = 1/r is the curvature.',
        plainText: 'Descartes circle theorem for curvatures'
      }
    ],
    properties: {
      fractalDimension: '≈ 1.3057',
      selfSimilar: true,
      discovered: '200 BC',
      discoverer: 'Apollonius of Perga',
      complexity: 'O(3^n) for n iterations',
      applications: ['Geometry', 'Number theory', 'Art']
    },
    history: 'Named after Apollonius of Perga (c. 200 BC), who studied problems of tangent circles. The fractal nature was recognized in modern times.',
    relatedFractals: [
      { type: 'recursive-circle-removal', name: 'Recursive Circle Removal', relationship: 'Related construction' }
    ]
  },

  'menger-sponge': {
    name: 'Menger Sponge',
    family: 'geometric-family',
    formulas: [
      {
        title: 'Construction',
        description: 'Start with a cube. Divide into 27 smaller cubes. Remove the center cube and the 6 face-center cubes. Repeat for each remaining cube.',
        plainText: '3D recursive cube removal'
      },
      {
        title: 'Fractal Dimension',
        latex: 'D = \\frac{\\log(20)}{\\log(3)} \\approx 2.727',
        description: 'Each iteration creates 20 copies scaled by 1/3',
        plainText: 'D = log(20)/log(3) ≈ 2.727'
      },
      {
        title: 'Volume',
        latex: 'V_n = V_0 \\left(\\frac{20}{27}\\right)^n',
        description: 'Volume approaches zero as iterations increase',
        plainText: 'V(n) = V(0) * (20/27)^n'
      }
    ],
    properties: {
      fractalDimension: 'log(20)/log(3) ≈ 2.727',
      selfSimilar: true,
      discovered: '1926',
      discoverer: 'Karl Menger',
      complexity: 'O(20^n) for n iterations',
      applications: ['Topology', 'Geometry', 'Art']
    },
    history: 'Discovered by Austrian mathematician Karl Menger in 1926. It is a 3D fractal with infinite surface area but zero volume, and it has the universal curve property.',
    relatedFractals: [
      { type: 'sierpinski-carpet', name: 'Sierpinski Carpet', relationship: '2D analog' },
      { type: 'menger-carpet', name: 'Menger Carpet', relationship: '2D projection' }
    ]
  },

  // Additional Important Fractals
  'weierstrass': {
    name: 'Weierstrass Function',
    family: 'nowhere-differentiable-family',
    formulas: [
      {
        title: 'Weierstrass Function',
        latex: 'f(x) = \\sum_{n=0}^{\\infty} a^n \\cos(b^n \\pi x)',
        description: 'A continuous function that is nowhere differentiable, where 0 < a < 1, b is an odd integer, and ab > 1 + 3π/2.',
        plainText: 'f(x) = sum of a^n * cos(b^n * π * x)'
      }
    ],
    properties: {
      fractalDimension: 'Varies (typically 2 - log(a)/log(b))',
      selfSimilar: false,
      discovered: '1872',
      discoverer: 'Karl Weierstrass',
      complexity: 'O(n) for n terms',
      applications: ['Analysis', 'Nowhere differentiable functions', 'Mathematical foundations']
    },
    history: 'Discovered by Karl Weierstrass in 1872, this was the first published example of a continuous function that is nowhere differentiable, challenging classical analysis.',
    relatedFractals: [
      { type: 'takagi', name: 'Takagi Function', relationship: 'Nowhere differentiable' },
      { type: 'blancmange', name: 'Blancmange Curve', relationship: 'Nowhere differentiable' }
    ]
  },

  'lorenz-attractor': {
    name: 'Lorenz Attractor',
    family: 'attractor-family',
    formulas: [
      {
        title: 'Lorenz System',
        latex: '\\begin{cases} \\frac{dx}{dt} = \\sigma(y - x) \\\\ \\frac{dy}{dt} = x(\\rho - z) - y \\\\ \\frac{dz}{dt} = xy - \\beta z \\end{cases}',
        description: 'A system of three differential equations modeling atmospheric convection, where σ, ρ, and β are parameters.',
        plainText: 'System of 3 differential equations'
      }
    ],
    properties: {
      fractalDimension: '≈ 2.06',
      selfSimilar: false,
      discovered: '1963',
      discoverer: 'Edward Lorenz',
      complexity: 'O(n) for n time steps',
      applications: ['Chaos theory', 'Meteorology', 'Dynamical systems']
    },
    history: 'Discovered by meteorologist Edward Lorenz in 1963 while studying weather prediction. It was one of the first examples of a strange attractor and led to the discovery of chaos theory.',
    relatedFractals: [
      { type: 'rossler-attractor', name: 'Rössler Attractor', relationship: 'Strange attractor' }
    ]
  },

  'diffusion-limited-aggregation': {
    name: 'Diffusion Limited Aggregation',
    family: 'physics-family',
    formulas: [
      {
        title: 'Growth Process',
        description: 'Particles perform random walks and stick when they touch the cluster. The cluster grows through diffusion-limited aggregation.',
        plainText: 'Random walk particle aggregation'
      },
      {
        title: 'Fractal Dimension',
        latex: 'D \\approx 1.7',
        description: 'The cluster has a fractal dimension of approximately 1.7 in 2D',
        plainText: 'D ≈ 1.7'
      }
    ],
    properties: {
      fractalDimension: '≈ 1.7',
      selfSimilar: true,
      discovered: '1981',
      discoverer: 'Thomas Witten and Leonard Sander',
      complexity: 'O(n²) for n particles',
      applications: ['Physics', 'Crystal growth', 'Electrodeposition', 'Biological growth']
    },
    history: 'Discovered by Thomas Witten and Leonard Sander in 1981. DLA models many natural growth processes, from electrodeposition to bacterial colonies.',
    relatedFractals: []
  },

  'vicsek': {
    name: 'Vicsek Snowflake',
    family: 'geometric-family',
    formulas: [
      {
        title: 'Construction',
        description: 'Start with a square. Divide into 9 smaller squares. Keep the center and 4 corner squares. Repeat for each remaining square.',
        plainText: 'Recursive square pattern with 5 copies'
      },
      {
        title: 'Fractal Dimension',
        latex: 'D = \\frac{\\log(5)}{\\log(3)} \\approx 1.465',
        description: 'Each iteration creates 5 copies scaled by 1/3',
        plainText: 'D = log(5)/log(3) ≈ 1.465'
      }
    ],
    properties: {
      fractalDimension: 'log(5)/log(3) ≈ 1.465',
      selfSimilar: true,
      discovered: '1990s',
      discoverer: 'Tamás Vicsek',
      complexity: 'O(5^n) for n iterations',
      applications: ['Geometry', 'Art', 'Education']
    },
    history: 'Named after physicist Tamás Vicsek, this fractal demonstrates a square-based construction similar to the Sierpinski carpet but with a different pattern.',
    relatedFractals: [
      { type: 'sierpinski-carpet', name: 'Sierpinski Carpet', relationship: 'Similar construction' }
    ]
  },

  // Additional Sierpinski Variants
  'sierpinski-lsystem': {
    name: 'Sierpinski L-System',
    family: 'sierpinski-family',
    formulas: [
      {
        title: 'L-System Rules',
        description: 'Uses Lindenmayer system (L-system) grammar to generate the Sierpinski triangle through string rewriting.',
        plainText: 'L-system string rewriting rules'
      },
      {
        title: 'Axiom and Rules',
        latex: '\\text{Axiom: } A \\\\ A \\to B-A-B \\\\ B \\to A+B+A',
        description: 'Starting axiom A, with replacement rules that create the triangular pattern.',
        plainText: 'Axiom: A, Rules: A→B-A-B, B→A+B+A'
      }
    ],
    properties: {
      fractalDimension: 'log(3)/log(2) ≈ 1.585',
      selfSimilar: true,
      discovered: '1968',
      discoverer: 'Aristid Lindenmayer',
      complexity: 'O(3^n) for n iterations',
      applications: ['Biology', 'Computer graphics', 'Education']
    },
    history: 'Uses L-systems developed by biologist Aristid Lindenmayer in 1968 to model plant growth. The Sierpinski triangle can be generated using simple string rewriting rules.',
    relatedFractals: [
      { type: 'sierpinski', name: 'Sierpinski Triangle', relationship: 'Same fractal' },
      { type: 'plant', name: 'Plant', relationship: 'L-system' }
    ]
  },

  'sierpinski-tetrahedron': {
    name: 'Sierpinski Tetrahedron',
    family: 'sierpinski-family',
    formulas: [
      {
        title: 'Construction',
        description: '3D generalization: Start with a tetrahedron. Remove the central inverted tetrahedron. Repeat for each remaining tetrahedron.',
        plainText: '3D recursive tetrahedron removal'
      },
      {
        title: 'Fractal Dimension',
        latex: 'D = \\frac{\\log(4)}{\\log(2)} = 2',
        description: 'Each iteration creates 4 copies scaled by 1/2',
        plainText: 'D = log(4)/log(2) = 2'
      }
    ],
    properties: {
      fractalDimension: '2.0',
      selfSimilar: true,
      discovered: '1915',
      discoverer: 'Wacław Sierpiński',
      complexity: 'O(4^n) for n iterations',
      applications: ['3D geometry', 'Topology', 'Art']
    },
    history: 'The 3D version of the Sierpinski triangle, shown here as a 2D projection. It demonstrates how fractals extend into higher dimensions.',
    relatedFractals: [
      { type: 'sierpinski', name: 'Sierpinski Triangle', relationship: '2D version' },
      { type: 'menger-sponge', name: 'Menger Sponge', relationship: '3D fractal' }
    ]
  },

  'quadrilateral-subdivision': {
    name: 'Quadrilateral Subdivision',
    family: 'sierpinski-family',
    formulas: [
      {
        title: 'Construction',
        description: 'Recursively subdivide quadrilaterals (squares or rectangles) by removing or transforming central regions.',
        plainText: 'Recursive quadrilateral subdivision'
      }
    ],
    properties: {
      fractalDimension: 'Varies',
      selfSimilar: true,
      discovered: '1916',
      discoverer: 'Wacław Sierpiński',
      complexity: 'O(k^n) for n iterations',
      applications: ['Geometry', 'Art']
    },
    history: 'A generalization of the Sierpinski carpet using quadrilateral shapes, demonstrating the fractal concept with different base polygons.',
    relatedFractals: [
      { type: 'sierpinski-carpet', name: 'Sierpinski Carpet', relationship: 'Square-based variant' }
    ]
  },

  'recursive-polygon-splitting': {
    name: 'Recursive Polygon Splitting',
    family: 'sierpinski-family',
    formulas: [
      {
        title: 'Construction',
        description: 'Recursively split polygons into smaller polygons according to a pattern, creating fractal structures.',
        plainText: 'Recursive polygon splitting algorithm'
      }
    ],
    properties: {
      fractalDimension: 'Varies',
      selfSimilar: true,
      discovered: '1915',
      discoverer: 'Wacław Sierpiński',
      complexity: 'O(k^n) for n iterations',
      applications: ['Geometry', 'Computer graphics']
    },
    history: 'A general approach to creating fractals by recursively splitting polygons, generalizing the Sierpinski triangle concept.',
    relatedFractals: [
      { type: 'sierpinski', name: 'Sierpinski Triangle', relationship: 'Base fractal' }
    ]
  },

  'triangular-subdivision': {
    name: 'Triangular Subdivision',
    family: 'sierpinski-family',
    formulas: [
      {
        title: 'Construction',
        description: 'Recursively subdivide triangles into smaller triangles, similar to the Sierpinski triangle but with different splitting patterns.',
        plainText: 'Recursive triangular subdivision'
      }
    ],
    properties: {
      fractalDimension: 'Varies',
      selfSimilar: true,
      discovered: '1915',
      discoverer: 'Wacław Sierpiński',
      complexity: 'O(k^n) for n iterations',
      applications: ['Geometry', 'Mesh generation']
    },
    history: 'A variant of triangular subdivision methods, related to the Sierpinski triangle but using different recursive patterns.',
    relatedFractals: [
      { type: 'sierpinski', name: 'Sierpinski Triangle', relationship: 'Base fractal' }
    ]
  },

  // Koch Variants
  'fractal-islands': {
    name: 'Fractal Islands',
    family: 'koch-family',
    formulas: [
      {
        title: 'Construction',
        description: 'Island-like fractals created using Koch curve principles, forming closed shapes that resemble islands or coastlines.',
        plainText: 'Koch-based island construction'
      }
    ],
    properties: {
      fractalDimension: 'Varies (typically 1.2-1.5)',
      selfSimilar: true,
      discovered: '1904',
      discoverer: 'Helge von Koch',
      complexity: 'O(4^n) for n iterations',
      applications: ['Coastline modeling', 'Art', 'Geography']
    },
    history: 'Based on Koch curve principles, fractal islands model the infinite complexity of coastlines, as described by Benoit Mandelbrot.',
    relatedFractals: [
      { type: 'koch', name: 'Koch Snowflake', relationship: 'Base fractal' }
    ]
  },

  'quadratic-koch': {
    name: 'Quadratic Koch Island',
    family: 'koch-family',
    formulas: [
      {
        title: 'Construction',
        description: 'A variant of the Koch curve using quadratic (square-based) segments instead of triangular bumps.',
        plainText: 'Square-based Koch construction'
      },
      {
        title: 'Fractal Dimension',
        latex: 'D = \\frac{\\log(8)}{\\log(4)} = 1.5',
        description: 'Each iteration creates 8 copies scaled by 1/4',
        plainText: 'D = log(8)/log(4) = 1.5'
      }
    ],
    properties: {
      fractalDimension: '1.5',
      selfSimilar: true,
      discovered: '1904',
      discoverer: 'Helge von Koch',
      complexity: 'O(8^n) for n iterations',
      applications: ['Geometry', 'Art', 'Education']
    },
    history: 'A variant of the classic Koch snowflake using square segments, creating a different but equally fascinating fractal pattern.',
    relatedFractals: [
      { type: 'koch', name: 'Koch Snowflake', relationship: 'Base fractal' }
    ]
  },

  // Additional Cantor Variants
  'cantor-dust-base-expansion': {
    name: 'Cantor Dust (Base Expansion)',
    family: 'cantor-family',
    formulas: [
      {
        title: 'Construction',
        description: 'Cantor set constructed using base expansion methods, where points are excluded based on their representation in different number bases.',
        plainText: 'Base expansion construction method'
      }
    ],
    properties: {
      fractalDimension: 'log(2)/log(3) ≈ 0.631',
      selfSimilar: true,
      discovered: '1883',
      discoverer: 'Georg Cantor',
      complexity: 'O(2^n) for n iterations',
      applications: ['Number theory', 'Set theory']
    },
    history: 'A construction method for the Cantor set using number base expansions, demonstrating the connection between fractals and number theory.',
    relatedFractals: [
      { type: 'cantor', name: 'Cantor Set', relationship: 'Same fractal' }
    ]
  },

  'cantor-dust-circular': {
    name: 'Cantor Dust (Circular)',
    family: 'cantor-family',
    formulas: [
      {
        title: 'Construction',
        description: 'Cantor set variant using circular regions instead of line segments, creating a 2D dust pattern.',
        plainText: 'Circular Cantor dust construction'
      }
    ],
    properties: {
      fractalDimension: 'Varies',
      selfSimilar: true,
      discovered: '1883',
      discoverer: 'Georg Cantor',
      complexity: 'O(2^n) for n iterations',
      applications: ['Geometry', 'Set theory']
    },
    history: 'A 2D extension of the Cantor set using circular regions, creating a "dust" pattern in the plane.',
    relatedFractals: [
      { type: 'cantor', name: 'Cantor Set', relationship: '1D version' }
    ]
  },

  'random-cantor': {
    name: 'Randomised Cantor Set',
    family: 'cantor-family',
    formulas: [
      {
        title: 'Construction',
        description: 'Cantor set with randomized removal patterns, where the removed middle section varies randomly in size or position.',
        plainText: 'Randomized Cantor construction'
      }
    ],
    properties: {
      fractalDimension: 'Varies',
      selfSimilar: false,
      discovered: '1980s',
      discoverer: 'Fractal community',
      complexity: 'O(2^n) for n iterations',
      applications: ['Stochastic processes', 'Random fractals']
    },
    history: 'A probabilistic variant of the Cantor set, introducing randomness while maintaining fractal-like properties.',
    relatedFractals: [
      { type: 'cantor', name: 'Cantor Set', relationship: 'Deterministic version' }
    ]
  },

  // Additional Dragon Curves
  'binary-dragon': {
    name: 'Binary Dragon',
    family: 'dragon-family',
    formulas: [
      {
        title: 'Construction',
        description: 'A dragon curve constructed using binary number representation, where each binary digit determines the turn direction.',
        plainText: 'Binary representation construction'
      }
    ],
    properties: {
      fractalDimension: '2.0 (space-filling)',
      selfSimilar: true,
      discovered: '1966',
      discoverer: 'John Heighway',
      complexity: 'O(2^n) for n iterations',
      applications: ['Geometry', 'Number theory']
    },
    history: 'A construction method for dragon curves using binary numbers, demonstrating the connection between number representation and fractal geometry.',
    relatedFractals: [
      { type: 'heighway-dragon', name: 'Heighway Dragon', relationship: 'Same fractal' }
    ]
  },

  'dragon-lsystem': {
    name: 'Dragon L-System',
    family: 'dragon-family',
    formulas: [
      {
        title: 'L-System Rules',
        description: 'Dragon curve generated using L-system grammar with string rewriting rules.',
        plainText: 'L-system string rewriting'
      },
      {
        title: 'Axiom and Rules',
        latex: '\\text{Axiom: } FX \\\\ X \\to X+YF+ \\\\ Y \\to -FX-Y',
        description: 'Starting with FX, applying replacement rules to generate the dragon curve.',
        plainText: 'Axiom: FX, Rules: X→X+YF+, Y→-FX-Y'
      }
    ],
    properties: {
      fractalDimension: '2.0 (space-filling)',
      selfSimilar: true,
      discovered: '1968',
      discoverer: 'Aristid Lindenmayer',
      complexity: 'O(2^n) for n iterations',
      applications: ['L-systems', 'Computer graphics']
    },
    history: 'The dragon curve can be generated using L-systems, demonstrating how complex fractals can arise from simple string rewriting rules.',
    relatedFractals: [
      { type: 'heighway-dragon', name: 'Heighway Dragon', relationship: 'Same fractal' }
    ]
  },

  'folded-paper-dragon': {
    name: 'Folded Paper Dragon',
    family: 'dragon-family',
    formulas: [
      {
        title: 'Construction',
        description: 'The classic paper-folding construction: fold a strip of paper in half repeatedly, then unfold with 90° angles.',
        plainText: 'Paper folding method'
      }
    ],
    properties: {
      fractalDimension: '2.0 (space-filling)',
      selfSimilar: true,
      discovered: '1966',
      discoverer: 'John Heighway',
      complexity: 'O(2^n) for n iterations',
      applications: ['Education', 'Art', 'Geometry']
    },
    history: 'The original discovery method for the dragon curve, found by John Heighway while folding paper strips.',
    relatedFractals: [
      { type: 'heighway-dragon', name: 'Heighway Dragon', relationship: 'Same fractal' }
    ]
  },

  'levy-dragon': {
    name: 'Lévy Dragon',
    family: 'dragon-family',
    formulas: [
      {
        title: 'Construction',
        description: 'A dragon curve variant using 45° angles instead of 90°, creating a smoother, more curved appearance.',
        plainText: '45-degree angle dragon curve'
      }
    ],
    properties: {
      fractalDimension: '2.0',
      selfSimilar: true,
      discovered: '1938',
      discoverer: 'Paul Lévy',
      complexity: 'O(2^n) for n iterations',
      applications: ['Geometry', 'Art']
    },
    history: 'Named after French mathematician Paul Lévy, this dragon curve variant uses different angles, creating distinct visual patterns.',
    relatedFractals: [
      { type: 'heighway-dragon', name: 'Heighway Dragon', relationship: 'Related curve' },
      { type: 'levy-c-curve', name: 'Lévy C Curve', relationship: 'Related curve' }
    ]
  },

  terdragon: {
    name: 'Terdragon',
    family: 'dragon-family',
    formulas: [
      {
        title: 'Construction',
        description: 'A dragon curve using base-3 (ternary) representation, where each ternary digit determines the turn direction.',
        plainText: 'Ternary representation construction'
      }
    ],
    properties: {
      fractalDimension: '≈ 1.465',
      selfSimilar: true,
      discovered: '1960s',
      discoverer: 'Fractal community',
      complexity: 'O(3^n) for n iterations',
      applications: ['Geometry', 'Number theory']
    },
    history: 'A ternary (base-3) variant of the dragon curve, demonstrating how different number bases create different fractal patterns.',
    relatedFractals: [
      { type: 'heighway-dragon', name: 'Heighway Dragon', relationship: 'Binary version' },
      { type: 'twindragon', name: 'Twindragon', relationship: 'Related curve' }
    ]
  },

  twindragon: {
    name: 'Twindragon',
    family: 'dragon-family',
    formulas: [
      {
        title: 'Construction',
        description: 'Two dragon curves arranged symmetrically, creating a twin or double dragon pattern.',
        plainText: 'Symmetric double dragon construction'
      }
    ],
    properties: {
      fractalDimension: '2.0',
      selfSimilar: true,
      discovered: '1960s',
      discoverer: 'Fractal community',
      complexity: 'O(2^n) for n iterations',
      applications: ['Geometry', 'Art']
    },
    history: 'A symmetric arrangement of two dragon curves, creating beautiful twin patterns that tile the plane.',
    relatedFractals: [
      { type: 'heighway-dragon', name: 'Heighway Dragon', relationship: 'Single dragon' }
    ]
  },

  // Additional Space-Filling Curves
  'gosper-curve': {
    name: 'Gosper Curve',
    family: 'space-filling-family',
    formulas: [
      {
        title: 'Construction',
        description: 'A space-filling curve that fills a hexagonal region, discovered by mathematician Bill Gosper.',
        plainText: 'Hexagonal space-filling curve'
      }
    ],
    properties: {
      fractalDimension: '2.0 (space-filling)',
      selfSimilar: true,
      discovered: '1973',
      discoverer: 'Bill Gosper',
      complexity: 'O(7^n) for n iterations',
      applications: ['Geometry', 'Computer graphics']
    },
    history: 'Discovered by Bill Gosper in 1973, this curve fills a hexagonal region and is related to the Koch snowflake.',
    relatedFractals: [
      { type: 'hilbert-curve', name: 'Hilbert Curve', relationship: 'Space-filling curve' },
      { type: 'koch', name: 'Koch Snowflake', relationship: 'Related structure' }
    ]
  },

  'levy-c-curve': {
    name: 'Lévy C Curve',
    family: 'space-filling-family',
    formulas: [
      {
        title: 'Construction',
        description: 'Start with a line segment. Replace it with two segments forming a right angle. Repeat for each new segment.',
        plainText: 'Recursive right-angle replacement'
      },
      {
        title: 'Fractal Dimension',
        latex: 'D = 2',
        description: 'The curve is space-filling in the limit',
        plainText: 'D = 2 (space-filling)'
      }
    ],
    properties: {
      fractalDimension: '2.0 (space-filling)',
      selfSimilar: true,
      discovered: '1938',
      discoverer: 'Paul Lévy',
      complexity: 'O(2^n) for n iterations',
      applications: ['Geometry', 'Art']
    },
    history: 'Discovered by Paul Lévy in 1938, this simple construction creates a space-filling curve through recursive right-angle replacements.',
    relatedFractals: [
      { type: 'levy-dragon', name: 'Lévy Dragon', relationship: 'Related curve' },
      { type: 'hilbert-curve', name: 'Hilbert Curve', relationship: 'Space-filling curve' }
    ]
  },

  'moore-curve': {
    name: 'Moore Curve',
    family: 'space-filling-family',
    formulas: [
      {
        title: 'Construction',
        description: 'A variant of the Hilbert curve that forms closed loops, discovered by E. H. Moore.',
        plainText: 'Closed-loop space-filling curve'
      }
    ],
    properties: {
      fractalDimension: '2.0 (space-filling)',
      selfSimilar: true,
      discovered: '1900',
      discoverer: 'E. H. Moore',
      complexity: 'O(4^n) for n iterations',
      applications: ['Topology', 'Data structures']
    },
    history: 'Discovered by E. H. Moore in 1900, this curve is a closed variant of the Hilbert curve, forming continuous loops.',
    relatedFractals: [
      { type: 'hilbert-curve', name: 'Hilbert Curve', relationship: 'Open version' }
    ]
  },

  'sierpinski-curve': {
    name: 'Sierpiński Curve',
    family: 'space-filling-family',
    formulas: [
      {
        title: 'Construction',
        description: 'A space-filling curve that traces out the Sierpinski triangle, providing a continuous path through the fractal.',
        plainText: 'Space-filling path through Sierpinski triangle'
      }
    ],
    properties: {
      fractalDimension: 'log(3)/log(2) ≈ 1.585',
      selfSimilar: true,
      discovered: '1915',
      discoverer: 'Wacław Sierpiński',
      complexity: 'O(3^n) for n iterations',
      applications: ['Geometry', 'Space-filling curves']
    },
    history: 'A space-filling curve that visits every point in the Sierpinski triangle, demonstrating how fractals can be traversed continuously.',
    relatedFractals: [
      { type: 'sierpinski', name: 'Sierpinski Triangle', relationship: 'Same fractal' },
      { type: 'sierpinski-arrowhead', name: 'Sierpinski Arrowhead', relationship: 'Related curve' }
    ]
  },

  'de-rham-curve': {
    name: 'De Rham Curve',
    family: 'self-similar-curves-family',
    formulas: [
      {
        title: 'Construction',
        description: 'A class of continuous, nowhere-differentiable curves discovered by Georges de Rham, constructed through recursive geometric operations.',
        plainText: 'Recursive geometric curve construction'
      }
    ],
    properties: {
      fractalDimension: 'Varies',
      selfSimilar: true,
      discovered: '1957',
      discoverer: 'Georges de Rham',
      complexity: 'O(2^n) for n iterations',
      applications: ['Analysis', 'Geometry']
    },
    history: 'Discovered by Swiss mathematician Georges de Rham in 1957, these curves are continuous but nowhere differentiable, challenging classical analysis.',
    relatedFractals: [
      { type: 'weierstrass', name: 'Weierstrass Function', relationship: 'Nowhere differentiable' }
    ]
  },

  // Nowhere Differentiable Functions
  takagi: {
    name: 'Takagi Function',
    family: 'nowhere-differentiable-family',
    formulas: [
      {
        title: 'Takagi Function',
        latex: 'T(x) = \\sum_{n=0}^{\\infty} \\frac{1}{2^n} \\text{dist}(2^n x, \\mathbb{Z})',
        description: 'A continuous, nowhere-differentiable function constructed using the distance from 2ⁿx to the nearest integer.',
        plainText: 'T(x) = sum of (1/2^n) * distance(2^n * x, nearest integer)'
      }
    ],
    properties: {
      fractalDimension: '1.0',
      selfSimilar: false,
      discovered: '1903',
      discoverer: 'Teiji Takagi',
      complexity: 'O(n) for n terms',
      applications: ['Analysis', 'Nowhere differentiable functions']
    },
    history: 'Discovered by Japanese mathematician Teiji Takagi in 1903, this function is simpler than Weierstrass\'s but equally pathological.',
    relatedFractals: [
      { type: 'weierstrass', name: 'Weierstrass Function', relationship: 'Nowhere differentiable' },
      { type: 'blancmange', name: 'Blancmange Curve', relationship: 'Nowhere differentiable' }
    ]
  },

  blancmange: {
    name: 'Blancmange Curve',
    family: 'nowhere-differentiable-family',
    formulas: [
      {
        title: 'Blancmange Function',
        latex: 'B(x) = \\sum_{n=0}^{\\infty} \\frac{s(2^n x)}{2^n}',
        description: 'Where s(x) is the sawtooth function (distance from x to nearest integer). The name comes from its resemblance to the French dessert.',
        plainText: 'B(x) = sum of sawtooth(2^n * x) / 2^n'
      }
    ],
    properties: {
      fractalDimension: '1.0',
      selfSimilar: false,
      discovered: '1904',
      discoverer: 'Teiji Takagi',
      complexity: 'O(n) for n terms',
      applications: ['Analysis', 'Art', 'Education']
    },
    history: 'Also known as the Takagi-Landsberg function, discovered around 1904. Its name comes from its wavy, dessert-like appearance.',
    relatedFractals: [
      { type: 'weierstrass', name: 'Weierstrass Function', relationship: 'Nowhere differentiable' },
      { type: 'takagi', name: 'Takagi Function', relationship: 'Related function' }
    ]
  },

  // Escape-Time Fractals
  buffalo: {
    name: 'Buffalo',
    family: 'escape-time-family',
    formulas: [
      {
        title: 'Iteration Formula',
        latex: 'z_{n+1} = (|\\text{Re}(z_n)| - |\\text{Im}(z_n)|)^2 + c',
        description: 'Uses the difference of absolute values before squaring, creating distinctive buffalo-like patterns.',
        plainText: 'z(n+1) = (|Re(z(n))| - |Im(z(n))|)² + c'
      }
    ],
    properties: {
      fractalDimension: '2.0 (boundary)',
      selfSimilar: true,
      discovered: '1990s',
      discoverer: 'Fractal community',
      complexity: 'O(n²) per pixel',
      applications: ['Art', 'Computer graphics']
    },
    history: 'A variant of escape-time fractals discovered in the 1990s, named for its distinctive shape resembling a buffalo.',
    relatedFractals: [
      { type: 'mandelbrot', name: 'Mandelbrot Set', relationship: 'Base fractal' },
      { type: 'burning-ship', name: 'Burning Ship', relationship: 'Similar variant' }
    ]
  },

  popcorn: {
    name: 'Popcorn',
    family: 'escape-time-family',
    formulas: [
      {
        title: 'Iteration Formula',
        latex: 'z_{n+1} = z_n - h \\cdot \\tan(z_n) + c',
        description: 'Uses tangent function in the iteration, creating "popcorn"-like scattered patterns.',
        plainText: 'z(n+1) = z(n) - h * tan(z(n)) + c'
      }
    ],
    properties: {
      fractalDimension: 'Varies',
      selfSimilar: true,
      discovered: '1990s',
      discoverer: 'Fractal community',
      complexity: 'O(n²) per pixel',
      applications: ['Art', 'Mathematical visualization']
    },
    history: 'Named for its scattered, popcorn-like appearance, this fractal uses trigonometric functions in its iteration formula.',
    relatedFractals: [
      { type: 'mandelbrot', name: 'Mandelbrot Set', relationship: 'Escape-time fractal' }
    ]
  },

  'spider-set': {
    name: 'Spider Set',
    family: 'escape-time-family',
    formulas: [
      {
        title: 'Iteration Formula',
        latex: 'z_{n+1} = z_n^2 + c + \\frac{p}{z_n}',
        description: 'Adds a reciprocal term p/zₙ to the standard Mandelbrot iteration, creating spider-like structures.',
        plainText: 'z(n+1) = z(n)² + c + p/z(n)'
      }
    ],
    properties: {
      fractalDimension: '2.0 (boundary)',
      selfSimilar: true,
      discovered: '1990s',
      discoverer: 'Fractal community',
      complexity: 'O(n²) per pixel',
      applications: ['Art', 'Dynamical systems']
    },
    history: 'A variant of the Mandelbrot set with an additional reciprocal term, creating intricate spider-web-like patterns.',
    relatedFractals: [
      { type: 'mandelbrot', name: 'Mandelbrot Set', relationship: 'Base fractal' }
    ]
  },

  magnet: {
    name: 'Magnet Fractal',
    family: 'escape-time-family',
    formulas: [
      {
        title: 'Iteration Formula',
        latex: 'z_{n+1} = \\frac{(z_n^2 + c - 1)^2}{4z_n(z_n^2 + c - 2)}',
        description: 'A rational function iteration that creates magnetic field-like patterns.',
        plainText: 'Rational function iteration'
      }
    ],
    properties: {
      fractalDimension: 'Varies',
      selfSimilar: true,
      discovered: '1990s',
      discoverer: 'Fractal community',
      complexity: 'O(n²) per pixel',
      applications: ['Art', 'Dynamical systems']
    },
    history: 'Named for its resemblance to magnetic field lines, this fractal uses rational function iterations to create distinctive patterns.',
    relatedFractals: [
      { type: 'mandelbrot', name: 'Mandelbrot Set', relationship: 'Escape-time fractal' }
    ]
  },

  // Root-Finding Fractals
  nova: {
    name: 'Nova Fractal',
    family: 'root-finding-family',
    formulas: [
      {
        title: 'Nova Iteration',
        latex: 'z_{n+1} = z_n - \\alpha \\frac{f(z_n)}{f\'(z_n)} + \\beta (z_n - z_{n-1})',
        description: 'A modified Newton\'s method with memory term and adjustable parameters α and β.',
        plainText: 'Modified Newton method with memory'
      }
    ],
    properties: {
      fractalDimension: 'Varies',
      selfSimilar: true,
      discovered: '1990s',
      discoverer: 'Fractal community',
      complexity: 'O(n²) per pixel',
      applications: ['Numerical analysis', 'Art']
    },
    history: 'A variant of Newton\'s method that includes a memory term, creating "nova"-like explosion patterns in the basins of attraction.',
    relatedFractals: [
      { type: 'newton', name: 'Newton Fractal', relationship: 'Base method' }
    ]
  },

  'fractal-dimension-plot': {
    name: 'Fractal Dimension Plot',
    family: 'dimension-plot-family',
    formulas: [
      {
        title: 'Hausdorff Dimension',
        latex: 'D_H = \\inf\\{d : H^d(E) = 0\\}',
        description: 'Visualizes the Hausdorff dimension of fractals, where Hᵈ is the d-dimensional Hausdorff measure.',
        plainText: 'D_H = inf{d : H^d(E) = 0}'
      }
    ],
    properties: {
      fractalDimension: 'N/A (visualization)',
      selfSimilar: false,
      discovered: '1918',
      discoverer: 'Felix Hausdorff',
      complexity: 'O(n²) per pixel',
      applications: ['Fractal analysis', 'Mathematical visualization']
    },
    history: 'Visualizes the concept of fractal dimension, developed by Felix Hausdorff in 1918, showing how fractals fill space differently than regular shapes.',
    relatedFractals: []
  },

  // Plant and Tree Families
  plant: {
    name: 'Plant',
    family: 'plant-family',
    formulas: [
      {
        title: 'L-System or IFS',
        description: 'Plant-like fractals generated using L-systems (Lindenmayer systems) or Iterated Function Systems (IFS) to model natural plant growth.',
        plainText: 'L-system or IFS plant generation'
      }
    ],
    properties: {
      fractalDimension: 'Varies (typically 1.5-2.0)',
      selfSimilar: true,
      discovered: '1968',
      discoverer: 'Aristid Lindenmayer',
      complexity: 'O(n) for n iterations',
      applications: ['Biology', 'Computer graphics', 'Art']
    },
    history: 'Plant fractals model the branching patterns found in nature, using L-systems developed by biologist Aristid Lindenmayer in 1968.',
    relatedFractals: [
      { type: 'barnsley-fern', name: 'Barnsley Fern', relationship: 'IFS plant' },
      { type: 'fractal-tree', name: 'Fractal Tree', relationship: 'Tree structure' }
    ]
  },

  'fractal-tree': {
    name: 'Fractal Tree',
    family: 'plant-family',
    formulas: [
      {
        title: 'Construction',
        description: 'Start with a trunk. At the top, branch into two smaller branches at an angle. Repeat for each branch recursively.',
        plainText: 'Recursive binary branching'
      }
    ],
    properties: {
      fractalDimension: 'Varies',
      selfSimilar: true,
      discovered: '1968',
      discoverer: 'Aristid Lindenmayer',
      complexity: 'O(2^n) for n iterations',
      applications: ['Biology', 'Art', 'Education']
    },
    history: 'Simple fractal trees model the branching patterns of real trees, demonstrating how recursive rules create natural-looking structures.',
    relatedFractals: [
      { type: 'binary-fractal-tree', name: 'Binary Fractal Tree', relationship: 'Binary branching' },
      { type: 'pythagoras-tree', name: 'Pythagoras Tree', relationship: 'Tree structure' }
    ]
  },

  'pythagoras-tree-wide': {
    name: 'Pythagoras Tree (Wide)',
    family: 'tree-family',
    formulas: [
      {
        title: 'Construction',
        description: 'Pythagoras tree with wider angle between branches, creating a more spread-out tree structure.',
        plainText: 'Wide-angle Pythagoras tree'
      }
    ],
    properties: {
      fractalDimension: '2.0',
      selfSimilar: true,
      discovered: '1942',
      discoverer: 'Albert E. Bosman',
      complexity: 'O(2^n) for n iterations',
      applications: ['Education', 'Art']
    },
    history: 'A variant of the Pythagoras tree with adjusted angles to create wider, more spread-out tree structures.',
    relatedFractals: [
      { type: 'pythagoras-tree', name: 'Pythagoras Tree', relationship: 'Base fractal' }
    ]
  },

  'pythagoras-tree-narrow': {
    name: 'Pythagoras Tree (Narrow)',
    family: 'tree-family',
    formulas: [
      {
        title: 'Construction',
        description: 'Pythagoras tree with narrower angle between branches, creating a more compact, upright tree structure.',
        plainText: 'Narrow-angle Pythagoras tree'
      }
    ],
    properties: {
      fractalDimension: '2.0',
      selfSimilar: true,
      discovered: '1942',
      discoverer: 'Albert E. Bosman',
      complexity: 'O(2^n) for n iterations',
      applications: ['Education', 'Art']
    },
    history: 'A variant of the Pythagoras tree with adjusted angles to create narrower, more compact tree structures.',
    relatedFractals: [
      { type: 'pythagoras-tree', name: 'Pythagoras Tree', relationship: 'Base fractal' }
    ]
  },

  'binary-fractal-tree': {
    name: 'Binary Fractal Tree',
    family: 'tree-family',
    formulas: [
      {
        title: 'Construction',
        description: 'Each branch splits into exactly two smaller branches at a fixed angle, creating a binary tree structure.',
        plainText: 'Binary branching with fixed angle'
      }
    ],
    properties: {
      fractalDimension: 'Varies',
      selfSimilar: true,
      discovered: '1968',
      discoverer: 'Aristid Lindenmayer',
      complexity: 'O(2^n) for n iterations',
      applications: ['Biology', 'Computer graphics', 'Art']
    },
    history: 'The simplest fractal tree, using binary branching to model tree structures found in nature.',
    relatedFractals: [
      { type: 'fractal-tree', name: 'Fractal Tree', relationship: 'Base fractal' },
      { type: 'ternary-fractal-tree', name: 'Ternary Fractal Tree', relationship: 'Ternary variant' }
    ]
  },

  'ternary-fractal-tree': {
    name: 'Ternary Fractal Tree',
    family: 'tree-family',
    formulas: [
      {
        title: 'Construction',
        description: 'Each branch splits into three smaller branches, creating a ternary tree structure.',
        plainText: 'Ternary branching pattern'
      }
    ],
    properties: {
      fractalDimension: 'Varies',
      selfSimilar: true,
      discovered: '1968',
      discoverer: 'Aristid Lindenmayer',
      complexity: 'O(3^n) for n iterations',
      applications: ['Biology', 'Art']
    },
    history: 'A tree fractal where each branch splits into three, modeling more complex branching patterns.',
    relatedFractals: [
      { type: 'binary-fractal-tree', name: 'Binary Fractal Tree', relationship: 'Binary version' },
      { type: 'quaternary-fractal-tree', name: 'Quaternary Fractal Tree', relationship: 'Quaternary variant' }
    ]
  },

  'quaternary-fractal-tree': {
    name: 'Quaternary Fractal Tree',
    family: 'tree-family',
    formulas: [
      {
        title: 'Construction',
        description: 'Each branch splits into four smaller branches, creating a quaternary tree structure.',
        plainText: 'Quaternary branching pattern'
      }
    ],
    properties: {
      fractalDimension: 'Varies',
      selfSimilar: true,
      discovered: '1968',
      discoverer: 'Aristid Lindenmayer',
      complexity: 'O(4^n) for n iterations',
      applications: ['Biology', 'Art']
    },
    history: 'A tree fractal with four-way branching, creating dense, bushy tree structures.',
    relatedFractals: [
      { type: 'ternary-fractal-tree', name: 'Ternary Fractal Tree', relationship: 'Ternary version' }
    ]
  },

  'lsystem-tree-oak': {
    name: 'Oak Tree (L-System)',
    family: 'tree-family',
    formulas: [
      {
        title: 'L-System Rules',
        description: 'L-system specifically designed to model oak tree growth patterns, with rules that create oak-like branching and leaf structures.',
        plainText: 'Oak-specific L-system rules'
      }
    ],
    properties: {
      fractalDimension: 'Varies',
      selfSimilar: true,
      discovered: '1968',
      discoverer: 'Aristid Lindenmayer',
      complexity: 'O(n) for n iterations',
      applications: ['Biology', 'Computer graphics', 'Art']
    },
    history: 'An L-system designed to model the specific growth patterns of oak trees, demonstrating how fractals can model real biological structures.',
    relatedFractals: [
      { type: 'lsystem-tree-pine', name: 'Pine Tree (L-System)', relationship: 'L-system tree' },
      { type: 'plant', name: 'Plant', relationship: 'L-system fractal' }
    ]
  },

  'lsystem-tree-pine': {
    name: 'Pine Tree (L-System)',
    family: 'tree-family',
    formulas: [
      {
        title: 'L-System Rules',
        description: 'L-system specifically designed to model pine tree growth patterns, with rules that create conical, needle-bearing structures.',
        plainText: 'Pine-specific L-system rules'
      }
    ],
    properties: {
      fractalDimension: 'Varies',
      selfSimilar: true,
      discovered: '1968',
      discoverer: 'Aristid Lindenmayer',
      complexity: 'O(n) for n iterations',
      applications: ['Biology', 'Computer graphics', 'Art']
    },
    history: 'An L-system designed to model the specific growth patterns of pine trees, creating conical, evergreen-like structures.',
    relatedFractals: [
      { type: 'lsystem-tree-oak', name: 'Oak Tree (L-System)', relationship: 'L-system tree' },
      { type: 'plant', name: 'Plant', relationship: 'L-system fractal' }
    ]
  },

  'fractal-canopy': {
    name: 'Fractal Canopy',
    family: 'tree-family',
    formulas: [
      {
        title: 'Construction',
        description: 'Models the canopy layer of trees, focusing on the branching patterns in the upper portion where leaves are concentrated.',
        plainText: 'Tree canopy branching pattern'
      }
    ],
    properties: {
      fractalDimension: 'Varies',
      selfSimilar: true,
      discovered: '1968',
      discoverer: 'Aristid Lindenmayer',
      complexity: 'O(2^n) for n iterations',
      applications: ['Biology', 'Ecology', 'Art']
    },
    history: 'Focuses on modeling the canopy structure of trees, important in ecology for understanding light capture and forest structure.',
    relatedFractals: [
      { type: 'fractal-tree', name: 'Fractal Tree', relationship: 'Full tree structure' }
    ]
  },

  // Tilings
  'domino-substitution': {
    name: 'Domino Substitution',
    family: 'tiling-family',
    formulas: [
      {
        title: 'Substitution Rules',
        description: 'Aperiodic tiling created by recursively substituting domino tiles according to specific rules.',
        plainText: 'Recursive domino substitution'
      }
    ],
    properties: {
      fractalDimension: '2.0',
      selfSimilar: true,
      discovered: '1960s',
      discoverer: 'Raphael Robinson',
      complexity: 'O(k^n) for n iterations',
      applications: ['Tiling theory', 'Crystallography', 'Art']
    },
    history: 'Part of the study of aperiodic tilings, which tile the plane without translational symmetry. Related to Penrose tilings.',
    relatedFractals: [
      { type: 'penrose-substitution', name: 'Penrose Substitution', relationship: 'Aperiodic tiling' }
    ]
  },

  'pinwheel-tiling': {
    name: 'Pinwheel Tiling',
    family: 'tiling-family',
    formulas: [
      {
        title: 'Construction',
        description: 'An aperiodic tiling using right triangles that can be rotated, creating pinwheel-like patterns.',
        plainText: 'Rotated right triangle tiling'
      }
    ],
    properties: {
      fractalDimension: '2.0',
      selfSimilar: true,
      discovered: '1994',
      discoverer: 'Charles Radin',
      complexity: 'O(k^n) for n iterations',
      applications: ['Tiling theory', 'Art']
    },
    history: 'Discovered by Charles Radin in 1994, this aperiodic tiling uses a single right triangle rotated in different orientations.',
    relatedFractals: [
      { type: 'penrose-substitution', name: 'Penrose Substitution', relationship: 'Aperiodic tiling' }
    ]
  },

  'snowflake-tiling': {
    name: 'Snowflake Tiling',
    family: 'tiling-family',
    formulas: [
      {
        title: 'Construction',
        description: 'Aperiodic tiling with snowflake-like motifs, created through substitution rules.',
        plainText: 'Snowflake pattern substitution tiling'
      }
    ],
    properties: {
      fractalDimension: '2.0',
      selfSimilar: true,
      discovered: '1990s',
      discoverer: 'Fractal community',
      complexity: 'O(k^n) for n iterations',
      applications: ['Tiling theory', 'Art']
    },
    history: 'An aperiodic tiling pattern that creates snowflake-like motifs through recursive substitution.',
    relatedFractals: [
      { type: 'penrose-substitution', name: 'Penrose Substitution', relationship: 'Aperiodic tiling' }
    ]
  },

  'amman-tiling': {
    name: 'Amman Tiling',
    family: 'tiling-family',
    formulas: [
      {
        title: 'Construction',
        description: 'Aperiodic tiling discovered by Robert Ammann, using specific tile shapes and matching rules.',
        plainText: 'Ammann tile substitution'
      }
    ],
    properties: {
      fractalDimension: '2.0',
      selfSimilar: true,
      discovered: '1970s',
      discoverer: 'Robert Ammann',
      complexity: 'O(k^n) for n iterations',
      applications: ['Tiling theory', 'Crystallography']
    },
    history: 'Discovered by amateur mathematician Robert Ammann in the 1970s, these tilings are important in the study of quasicrystals.',
    relatedFractals: [
      { type: 'penrose-substitution', name: 'Penrose Substitution', relationship: 'Aperiodic tiling' }
    ]
  },

  'penrose-substitution': {
    name: 'Penrose Substitution',
    family: 'tiling-family',
    formulas: [
      {
        title: 'Penrose Tiles',
        description: 'Uses two tile shapes (kites and darts, or rhombs) with matching rules to create aperiodic tilings.',
        plainText: 'Kite and dart or rhomb substitution'
      }
    ],
    properties: {
      fractalDimension: '2.0',
      selfSimilar: true,
      discovered: '1974',
      discoverer: 'Roger Penrose',
      complexity: 'O(φ^n) for n iterations, where φ is golden ratio',
      applications: ['Tiling theory', 'Quasicrystals', 'Art']
    },
    history: 'Discovered by Roger Penrose in 1974, these aperiodic tilings revolutionized our understanding of order and symmetry. They relate to quasicrystals discovered in 1982.',
    relatedFractals: [
      { type: 'amman-tiling', name: 'Amman Tiling', relationship: 'Aperiodic tiling' }
    ]
  },

  rauzy: {
    name: 'Rauzy',
    family: 'tiling-family',
    formulas: [
      {
        title: 'Rauzy Fractal',
        description: 'A fractal associated with substitutions and tiling theory, named after Gérard Rauzy.',
        plainText: 'Rauzy substitution fractal'
      }
    ],
    properties: {
      fractalDimension: 'Varies',
      selfSimilar: true,
      discovered: '1982',
      discoverer: 'Gérard Rauzy',
      complexity: 'O(k^n) for n iterations',
      applications: ['Tiling theory', 'Number theory']
    },
    history: 'Discovered by Gérard Rauzy in 1982, this fractal is associated with substitution systems and has connections to number theory.',
    relatedFractals: [
      { type: 'penrose-substitution', name: 'Penrose Substitution', relationship: 'Substitution tiling' }
    ]
  },

  'chair-tiling': {
    name: 'Chair Tiling',
    family: 'tiling-family',
    formulas: [
      {
        title: 'Construction',
        description: 'An aperiodic tiling using "chair"-shaped tiles that fit together according to specific rules.',
        plainText: 'Chair-shaped tile substitution'
      }
    ],
    properties: {
      fractalDimension: '2.0',
      selfSimilar: true,
      discovered: '1990s',
      discoverer: 'Fractal community',
      complexity: 'O(k^n) for n iterations',
      applications: ['Tiling theory', 'Art']
    },
    history: 'An aperiodic tiling pattern using chair-shaped tiles, demonstrating the diversity of aperiodic tiling systems.',
    relatedFractals: [
      { type: 'penrose-substitution', name: 'Penrose Substitution', relationship: 'Aperiodic tiling' }
    ]
  },

  'rhombic-tiling': {
    name: 'Rhombic Tiling',
    family: 'tiling-family',
    formulas: [
      {
        title: 'Construction',
        description: 'Tiling using rhombus (diamond) shapes, which can be periodic or aperiodic depending on the rules.',
        plainText: 'Rhombus tile substitution'
      }
    ],
    properties: {
      fractalDimension: '2.0',
      selfSimilar: true,
      discovered: '1974',
      discoverer: 'Roger Penrose',
      complexity: 'O(k^n) for n iterations',
      applications: ['Tiling theory', 'Art']
    },
    history: 'Rhombic tilings are fundamental in aperiodic tiling theory, with Penrose\'s original tiling using two types of rhombi.',
    relatedFractals: [
      { type: 'penrose-substitution', name: 'Penrose Substitution', relationship: 'Rhombic variant' }
    ]
  },

  'aperiodic-tilings': {
    name: 'Aperiodic Tilings',
    family: 'tiling-family',
    formulas: [
      {
        title: 'Definition',
        description: 'Tilings that cover the plane completely but lack translational symmetry - they never repeat exactly.',
        plainText: 'Non-periodic plane-filling tilings'
      }
    ],
    properties: {
      fractalDimension: '2.0',
      selfSimilar: true,
      discovered: '1960s',
      discoverer: 'Raphael Robinson',
      complexity: 'O(k^n) for n iterations',
      applications: ['Tiling theory', 'Quasicrystals', 'Art']
    },
    history: 'The study of aperiodic tilings began in the 1960s with Raphael Robinson. They have profound implications for crystallography and led to the discovery of quasicrystals.',
    relatedFractals: [
      { type: 'penrose-substitution', name: 'Penrose Substitution', relationship: 'Aperiodic tiling' },
      { type: 'amman-tiling', name: 'Amman Tiling', relationship: 'Aperiodic tiling' }
    ]
  },

  'substitution-tilings': {
    name: 'Substitution Tilings',
    family: 'tiling-family',
    formulas: [
      {
        title: 'Substitution Rules',
        description: 'Tilings created by recursively replacing tiles with smaller copies according to substitution rules.',
        plainText: 'Recursive tile substitution'
      }
    ],
    properties: {
      fractalDimension: '2.0',
      selfSimilar: true,
      discovered: '1970s',
      discoverer: 'Fractal community',
      complexity: 'O(k^n) for n iterations',
      applications: ['Tiling theory', 'Art']
    },
    history: 'A general class of tilings created through substitution rules, demonstrating how simple rules can create complex, non-repeating patterns.',
    relatedFractals: [
      { type: 'penrose-substitution', name: 'Penrose Substitution', relationship: 'Substitution tiling' }
    ]
  },

  // Attractor Family
  'rossler-attractor': {
    name: 'Rössler Attractor',
    family: 'attractor-family',
    formulas: [
      {
        title: 'Rössler System',
        latex: '\\begin{cases} \\frac{dx}{dt} = -y - z \\\\ \\frac{dy}{dt} = x + ay \\\\ \\frac{dz}{dt} = b + z(x - c) \\end{cases}',
        description: 'A simpler strange attractor than Lorenz, with parameters a, b, and c controlling the behavior.',
        plainText: 'System of 3 differential equations'
      }
    ],
    properties: {
      fractalDimension: '≈ 2.01',
      selfSimilar: false,
      discovered: '1976',
      discoverer: 'Otto Rössler',
      complexity: 'O(n) for n time steps',
      applications: ['Chaos theory', 'Dynamical systems']
    },
    history: 'Discovered by German biochemist Otto Rössler in 1976, this attractor is simpler than Lorenz but equally fascinating, with a spiral structure.',
    relatedFractals: [
      { type: 'lorenz-attractor', name: 'Lorenz Attractor', relationship: 'Strange attractor' }
    ]
  },

  lyapunov: {
    name: 'Lyapunov Fractal',
    family: 'attractor-family',
    formulas: [
      {
        title: 'Lyapunov Exponent',
        latex: '\\lambda = \\lim_{n \\to \\infty} \\frac{1}{n} \\sum_{i=0}^{n-1} \\ln|f\'(x_i)|',
        description: 'Measures the rate of separation of infinitesimally close trajectories. Positive values indicate chaos.',
        plainText: 'λ = limit of average log of derivative'
      }
    ],
    properties: {
      fractalDimension: 'Varies',
      selfSimilar: true,
      discovered: '1892',
      discoverer: 'Aleksandr Lyapunov',
      complexity: 'O(n²) per pixel',
      applications: ['Chaos theory', 'Dynamical systems', 'Stability analysis']
    },
    history: 'Based on Lyapunov exponents developed by Russian mathematician Aleksandr Lyapunov in 1892. The fractal visualizes regions of stability and chaos.',
    relatedFractals: [
      { type: 'lorenz-attractor', name: 'Lorenz Attractor', relationship: 'Chaotic system' }
    ]
  },

  'chua-attractor': {
    name: 'Chua Attractor',
    family: 'attractor-family',
    formulas: [
      {
        title: 'Chua Circuit Equations',
        latex: '\\begin{cases} \\frac{dx}{dt} = \\alpha(y - x - f(x)) \\\\ \\frac{dy}{dt} = x - y + z \\\\ \\frac{dz}{dt} = -\\beta y \\end{cases}',
        description: 'Models the Chua circuit, an electronic circuit that exhibits chaotic behavior, where f(x) is a piecewise-linear function.',
        plainText: 'Chua circuit differential equations'
      }
    ],
    properties: {
      fractalDimension: '≈ 2.13',
      selfSimilar: false,
      discovered: '1983',
      discoverer: 'Leon Chua',
      complexity: 'O(n) for n time steps',
      applications: ['Chaos theory', 'Electronics', 'Circuit design']
    },
    history: 'Discovered by Leon Chua in 1983, this is the first physical system proven to exhibit chaos. It\'s a simple electronic circuit with a nonlinear element.',
    relatedFractals: [
      { type: 'lorenz-attractor', name: 'Lorenz Attractor', relationship: 'Strange attractor' }
    ]
  },

  'ifs-spiral': {
    name: 'IFS Spiral Attractor',
    family: 'attractor-family',
    formulas: [
      {
        title: 'Iterated Function System',
        latex: 'f_i(x, y) = \\begin{pmatrix} a_i & b_i \\\\ c_i & d_i \\end{pmatrix} \\begin{pmatrix} x \\\\ y \\end{pmatrix} + \\begin{pmatrix} e_i \\\\ f_i \\end{pmatrix}',
        description: 'Uses multiple affine transformations with probabilities to create spiral patterns.',
        plainText: 'IFS with spiral-generating transformations'
      }
    ],
    properties: {
      fractalDimension: 'Varies',
      selfSimilar: true,
      discovered: '1981',
      discoverer: 'John Hutchinson',
      complexity: 'O(n) for n points',
      applications: ['Computer graphics', 'Art', 'Fractal compression']
    },
    history: 'An Iterated Function System designed to create spiral patterns, demonstrating the versatility of IFS in generating natural-looking forms.',
    relatedFractals: [
      { type: 'ifs-maple', name: 'IFS Maple Leaf', relationship: 'IFS attractor' },
      { type: 'barnsley-fern', name: 'Barnsley Fern', relationship: 'IFS fractal' }
    ]
  },

  'ifs-maple': {
    name: 'IFS Maple Leaf Attractor',
    family: 'attractor-family',
    formulas: [
      {
        title: 'Iterated Function System',
        description: 'IFS designed to generate maple leaf shapes using affine transformations.',
        plainText: 'IFS with maple leaf transformations'
      }
    ],
    properties: {
      fractalDimension: 'Varies',
      selfSimilar: true,
      discovered: '1981',
      discoverer: 'John Hutchinson',
      complexity: 'O(n) for n points',
      applications: ['Computer graphics', 'Art']
    },
    history: 'An IFS designed to model maple leaf shapes, showing how natural forms can be generated through simple mathematical rules.',
    relatedFractals: [
      { type: 'ifs-spiral', name: 'IFS Spiral', relationship: 'IFS attractor' },
      { type: 'barnsley-fern', name: 'Barnsley Fern', relationship: 'IFS fractal' }
    ]
  },

  'ifs-tree': {
    name: 'IFS Tree Attractor',
    family: 'attractor-family',
    formulas: [
      {
        title: 'Iterated Function System',
        description: 'IFS designed to generate tree-like structures using branching transformations.',
        plainText: 'IFS with tree-generating transformations'
      }
    ],
    properties: {
      fractalDimension: 'Varies',
      selfSimilar: true,
      discovered: '1981',
      discoverer: 'John Hutchinson',
      complexity: 'O(n) for n points',
      applications: ['Computer graphics', 'Art', 'Biology']
    },
    history: 'An IFS designed to model tree structures, demonstrating how branching patterns can be generated through iterative transformations.',
    relatedFractals: [
      { type: 'ifs-spiral', name: 'IFS Spiral', relationship: 'IFS attractor' },
      { type: 'fractal-tree', name: 'Fractal Tree', relationship: 'Tree structure' }
    ]
  },

  // Noise Family
  'perlin-noise': {
    name: 'Perlin Noise',
    family: 'noise-family',
    formulas: [
      {
        title: 'Perlin Noise Function',
        description: 'A gradient noise function that creates smooth, natural-looking random patterns by interpolating between random gradients.',
        plainText: 'Gradient-based interpolation noise'
      }
    ],
    properties: {
      fractalDimension: 'Varies',
      selfSimilar: false,
      discovered: '1983',
      discoverer: 'Ken Perlin',
      complexity: 'O(1) per sample',
      applications: ['Computer graphics', 'Procedural generation', 'Texture synthesis']
    },
    history: 'Developed by Ken Perlin in 1983 for the movie Tron. It revolutionized procedural texture generation and won an Academy Award for Technical Achievement.',
    relatedFractals: [
      { type: 'simplex-noise', name: 'Simplex Noise', relationship: 'Improved variant' },
      { type: 'fractional-brownian-motion', name: 'Fractional Brownian Motion', relationship: 'Related noise' }
    ]
  },

  'simplex-noise': {
    name: 'Simplex Noise',
    family: 'noise-family',
    formulas: [
      {
        title: 'Simplex Noise Function',
        description: 'An improved version of Perlin noise using simplex grids instead of regular grids, providing better quality and performance.',
        plainText: 'Simplex grid-based noise'
      }
    ],
    properties: {
      fractalDimension: 'Varies',
      selfSimilar: false,
      discovered: '2001',
      discoverer: 'Ken Perlin',
      complexity: 'O(1) per sample',
      applications: ['Computer graphics', 'Procedural generation']
    },
    history: 'Developed by Ken Perlin in 2001 as an improvement over his original noise function, using simplex grids for better quality and fewer artifacts.',
    relatedFractals: [
      { type: 'perlin-noise', name: 'Perlin Noise', relationship: 'Original version' }
    ]
  },

  'fractional-brownian-motion': {
    name: 'Fractional Brownian Motion',
    family: 'noise-family',
    formulas: [
      {
        title: 'fBm Definition',
        latex: 'B_H(t) = \\frac{1}{\\Gamma(H+1/2)} \\int_{-\\infty}^t (t-s)^{H-1/2} dB(s)',
        description: 'A generalization of Brownian motion with Hurst exponent H, where H=0.5 gives standard Brownian motion.',
        plainText: 'Generalized Brownian motion with Hurst exponent'
      }
    ],
    properties: {
      fractalDimension: '2 - H (for H in [0,1])',
      selfSimilar: true,
      discovered: '1940',
      discoverer: 'Andrey Kolmogorov',
      complexity: 'O(n log n) for n samples',
      applications: ['Finance', 'Terrain generation', 'Texture synthesis']
    },
    history: 'First studied by Andrey Kolmogorov in 1940, fBm is used to model many natural phenomena including terrain, clouds, and financial time series.',
    relatedFractals: [
      { type: 'perlin-noise', name: 'Perlin Noise', relationship: 'Noise function' }
    ]
  },

  'random-midpoint-displacement': {
    name: 'Random Midpoint Displacement',
    family: 'noise-family',
    formulas: [
      {
        title: 'Algorithm',
        description: 'Recursively subdivides intervals, adding random displacement at midpoints, scaled by a factor that decreases with each level.',
        plainText: 'Recursive midpoint randomization'
      }
    ],
    properties: {
      fractalDimension: 'Varies',
      selfSimilar: false,
      discovered: '1980s',
      discoverer: 'Fractal community',
      complexity: 'O(n) for n points',
      applications: ['Terrain generation', 'Computer graphics']
    },
    history: 'A simple algorithm for generating fractal-like terrain, popular in early computer graphics for creating natural-looking landscapes.',
    relatedFractals: [
      { type: 'fractional-brownian-motion', name: 'Fractional Brownian Motion', relationship: 'Related noise' }
    ]
  },

  // Physics Family
  'percolation-cluster': {
    name: 'Percolation Cluster',
    family: 'physics-family',
    formulas: [
      {
        title: 'Percolation Model',
        description: 'Randomly occupies sites or bonds on a lattice with probability p. At the critical probability p_c, infinite clusters form.',
        plainText: 'Random site/bond occupation with probability p'
      },
      {
        title: 'Critical Probability',
        latex: 'p_c \\approx 0.5927 \\text{ (square lattice)}',
        description: 'The probability threshold where infinite clusters first appear.',
        plainText: 'p_c ≈ 0.5927 for square lattice'
      }
    ],
    properties: {
      fractalDimension: '≈ 1.896 (at criticality)',
      selfSimilar: true,
      discovered: '1957',
      discoverer: 'Simon Broadbent and John Hammersley',
      complexity: 'O(n²) for n×n lattice',
      applications: ['Physics', 'Materials science', 'Network theory']
    },
    history: 'Introduced by Simon Broadbent and John Hammersley in 1957, percolation theory models fluid flow through porous materials and has applications in many fields.',
    relatedFractals: [
      { type: 'diffusion-limited-aggregation', name: 'Diffusion Limited Aggregation', relationship: 'Growth process' }
    ]
  },

  'levy-flights': {
    name: 'Lévy Flights',
    family: 'physics-family',
    formulas: [
      {
        title: 'Lévy Distribution',
        latex: 'P(\\ell) \\sim \\ell^{-\\alpha}',
        description: 'Step lengths follow a power-law distribution with exponent α, where 0 < α < 2.',
        plainText: 'P(step length) ~ length^(-α)'
      }
    ],
    properties: {
      fractalDimension: 'Varies',
      selfSimilar: true,
      discovered: '1937',
      discoverer: 'Paul Lévy',
      complexity: 'O(n) for n steps',
      applications: ['Physics', 'Biology', 'Finance', 'Search algorithms']
    },
    history: 'Named after Paul Lévy who studied them in 1937, Lévy flights are random walks with power-law distributed step lengths, modeling many natural phenomena.',
    relatedFractals: [
      { type: 'fractional-brownian-motion', name: 'Fractional Brownian Motion', relationship: 'Random process' }
    ]
  },

  // Additional Geometric Fractals
  'carpenter-square': {
    name: 'Carpenter Square',
    family: 'geometric-family',
    formulas: [
      {
        title: 'Construction',
        description: 'Also known as the T-square fractal. Start with a square, attach smaller squares to each side, repeat recursively.',
        plainText: 'Recursive square attachment'
      },
      {
        title: 'Fractal Dimension',
        latex: 'D = \\frac{\\log(5)}{\\log(3)} \\approx 1.465',
        description: 'Each iteration creates 5 copies scaled by 1/3',
        plainText: 'D = log(5)/log(3) ≈ 1.465'
      }
    ],
    properties: {
      fractalDimension: 'log(5)/log(3) ≈ 1.465',
      selfSimilar: true,
      discovered: '1990s',
      discoverer: 'Fractal community',
      complexity: 'O(5^n) for n iterations',
      applications: ['Geometry', 'Art']
    },
    history: 'A fractal created by recursively attaching squares, named for its resemblance to a carpenter\'s square tool.',
    relatedFractals: [
      { type: 'box-variants', name: 'Box Fractal Variants', relationship: 'Box-based fractal' }
    ]
  },

  cross: {
    name: 'Cross Fractal',
    family: 'geometric-family',
    formulas: [
      {
        title: 'Construction',
        description: 'Start with a cross shape. Replace each arm with a smaller cross. Repeat recursively.',
        plainText: 'Recursive cross replacement'
      }
    ],
    properties: {
      fractalDimension: 'Varies',
      selfSimilar: true,
      discovered: '1990s',
      discoverer: 'Fractal community',
      complexity: 'O(k^n) for n iterations',
      applications: ['Geometry', 'Art']
    },
    history: 'A simple geometric fractal using cross shapes, demonstrating recursive replacement patterns.',
    relatedFractals: [
      { type: 'vicsek', name: 'Vicsek Snowflake', relationship: 'Cross-like pattern' }
    ]
  },

  'box-variants': {
    name: 'Box Fractal Variants',
    family: 'geometric-family',
    formulas: [
      {
        title: 'Construction',
        description: 'Various box-based fractals created by recursively subdividing or modifying boxes according to different rules.',
        plainText: 'Recursive box subdivision variants'
      }
    ],
    properties: {
      fractalDimension: 'Varies',
      selfSimilar: true,
      discovered: '1990s',
      discoverer: 'Fractal community',
      complexity: 'O(k^n) for n iterations',
      applications: ['Geometry', 'Art']
    },
    history: 'A family of fractals based on box shapes, demonstrating the variety of patterns possible with simple geometric rules.',
    relatedFractals: [
      { type: 'carpenter-square', name: 'Carpenter Square', relationship: 'Box-based fractal' }
    ]
  },

  'minkowski-sausage': {
    name: 'Minkowski Sausage',
    family: 'geometric-family',
    formulas: [
      {
        title: 'Construction',
        description: 'Also known as the Minkowski cover. Take a curve and "thicken" it by taking the set of all points within distance r, creating a "sausage" shape.',
        plainText: 'Curve thickening operation'
      },
      {
        title: 'Area',
        latex: 'A = L \\cdot 2r + \\pi r^2',
        description: 'For a curve of length L, the sausage area includes the rectangular part and semicircular ends.',
        plainText: 'A = L * 2r + π * r²'
      }
    ],
    properties: {
      fractalDimension: 'Varies',
      selfSimilar: false,
      discovered: '1901',
      discoverer: 'Hermann Minkowski',
      complexity: 'O(n) for n curve points',
      applications: ['Geometry', 'Measure theory']
    },
    history: 'Introduced by Hermann Minkowski in 1901, this construction is used in measure theory and has connections to the isoperimetric problem.',
    relatedFractals: []
  },

  cesaro: {
    name: 'Cesàro Fractal',
    family: 'geometric-family',
    formulas: [
      {
        title: 'Construction',
        description: 'A variant of the Koch curve where the replacement uses arcs instead of straight segments, creating smoother curves.',
        plainText: 'Arc-based Koch variant'
      }
    ],
    properties: {
      fractalDimension: 'Varies',
      selfSimilar: true,
      discovered: '1905',
      discoverer: 'Ernesto Cesàro',
      complexity: 'O(4^n) for n iterations',
      applications: ['Geometry', 'Art']
    },
    history: 'Named after Italian mathematician Ernesto Cesàro (1905), this fractal uses circular arcs instead of straight segments, creating smoother curves.',
    relatedFractals: [
      { type: 'koch', name: 'Koch Snowflake', relationship: 'Base fractal' }
    ]
  },

  'recursive-circle-removal': {
    name: 'Recursive Circle Removal',
    family: 'geometric-family',
    formulas: [
      {
        title: 'Construction',
        description: 'Similar to Apollonian gasket, recursively removes circles from a region according to specific rules.',
        plainText: 'Recursive circle removal pattern'
      }
    ],
    properties: {
      fractalDimension: 'Varies',
      selfSimilar: true,
      discovered: '200 BC',
      discoverer: 'Apollonius of Perga',
      complexity: 'O(k^n) for n iterations',
      applications: ['Geometry', 'Art']
    },
    history: 'Related to the Apollonian gasket, this fractal demonstrates how recursive circle removal creates intricate patterns.',
    relatedFractals: [
      { type: 'apollonian-gasket', name: 'Apollonian Gasket', relationship: 'Circle-based fractal' }
    ]
  },

  rose: {
    name: 'Rose Window',
    family: 'geometric-family',
    formulas: [
      {
        title: 'Rose Curve',
        latex: 'r = a \\cos(k\\theta) \\text{ or } r = a \\sin(k\\theta)',
        description: 'Polar equation creating rose-like patterns, where k determines the number of petals.',
        plainText: 'r = a * cos(k*θ) or r = a * sin(k*θ)'
      }
    ],
    properties: {
      fractalDimension: '1.0',
      selfSimilar: false,
      discovered: 'Ancient',
      discoverer: 'Ancient mathematicians',
      complexity: 'O(n) for n points',
      applications: ['Art', 'Architecture', 'Education']
    },
    history: 'Rose curves have been known since ancient times and are found in Gothic rose windows. When made recursive, they create fractal rose patterns.',
    relatedFractals: []
  },

  // Other Fractals
  'h-tree': {
    name: 'H-Tree',
    family: 'geometric-family',
    formulas: [
      {
        title: 'Construction',
        description: 'Start with a line segment. At each endpoint, attach two perpendicular segments forming an "H". Repeat for each new endpoint.',
        plainText: 'Recursive H-shaped branching'
      },
      {
        title: 'Fractal Dimension',
        latex: 'D = 2',
        description: 'The H-tree is space-filling in the limit',
        plainText: 'D = 2 (space-filling)'
      }
    ],
    properties: {
      fractalDimension: '2.0 (space-filling)',
      selfSimilar: true,
      discovered: '1990s',
      discoverer: 'Fractal community',
      complexity: 'O(2^n) for n iterations',
      applications: ['Computer science', 'Circuit layout', 'Art']
    },
    history: 'Used in computer science for binary tree visualization and circuit layout. The H-tree is a space-filling fractal.',
    relatedFractals: [
      { type: 'h-tree-generalized', name: 'Generalized H-Tree', relationship: 'Generalization' }
    ]
  },

  'h-tree-generalized': {
    name: 'Generalized H-Tree',
    family: 'geometric-family',
    formulas: [
      {
        title: 'Construction',
        description: 'Generalization of the H-tree with different branching angles, numbers of branches, or scaling factors.',
        plainText: 'Generalized H-tree construction'
      }
    ],
    properties: {
      fractalDimension: 'Varies',
      selfSimilar: true,
      discovered: '1990s',
      discoverer: 'Fractal community',
      complexity: 'O(k^n) for n iterations',
      applications: ['Computer science', 'Art']
    },
    history: 'A generalization of the H-tree allowing for different branching patterns and angles.',
    relatedFractals: [
      { type: 'h-tree', name: 'H-Tree', relationship: 'Base fractal' }
    ]
  },

  'fractal-flame': {
    name: 'Fractal Flame',
    family: 'other-family',
    formulas: [
      {
        title: 'Flame Algorithm',
        description: 'Uses iterated function systems with nonlinear variations and color mapping to create flame-like fractal images.',
        plainText: 'Nonlinear IFS with color mapping'
      }
    ],
    properties: {
      fractalDimension: 'Varies',
      selfSimilar: true,
      discovered: '1992',
      discoverer: 'Scott Draves',
      complexity: 'O(n) for n points',
      applications: ['Art', 'Computer graphics']
    },
    history: 'Developed by Scott Draves in 1992, the fractal flame algorithm creates stunning, flame-like images using nonlinear variations of IFS.',
    relatedFractals: [
      { type: 'barnsley-fern', name: 'Barnsley Fern', relationship: 'IFS fractal' }
    ]
  }
};

/**
 * Get information for a fractal type
 * @param {string} fractalType - The fractal type identifier
 * @returns {Object|null} Information object or null if not found
 */
export function getFractalInfo(fractalType) {
  return FRACTAL_INFO[fractalType] || null;
}

/**
 * Get related fractals with relationship information
 * @param {string} fractalType - The fractal type identifier
 * @returns {Array} Array of related fractal objects
 */
export function getRelatedFractals(fractalType) {
  const info = getFractalInfo(fractalType);
  return info ? info.relatedFractals : [];
}

/**
 * Mapping of discoverer names to their Wikipedia URLs
 */
const DISCOVERER_WIKIPEDIA_URLS = {
  'Benoit Mandelbrot': 'https://en.wikipedia.org/wiki/Benoit_Mandelbrot',
  'Gaston Julia': 'https://en.wikipedia.org/wiki/Gaston_Julia',
  'Wacław Sierpiński': 'https://en.wikipedia.org/wiki/Wac%C5%82aw_Sierpi%C5%84ski',
  'Helge von Koch': 'https://en.wikipedia.org/wiki/Helge_von_Koch',
  'Michael Michelitsch and Otto Rössler': 'https://en.wikipedia.org/wiki/Otto_R%C3%B6ssler',
  'Melinda Green': 'https://en.wikipedia.org/wiki/Melinda_Green',
  'Clifford Pickover': 'https://en.wikipedia.org/wiki/Clifford_Pickover',
  'Georg Cantor': 'https://en.wikipedia.org/wiki/Georg_Cantor',
  'Henry Smith': 'https://en.wikipedia.org/wiki/Henry_John_Stephen_Smith',
  'Vito Volterra': 'https://en.wikipedia.org/wiki/Vito_Volterra',
  'Karl Menger': 'https://en.wikipedia.org/wiki/Karl_Menger',
  'John Heighway': 'https://en.wikipedia.org/wiki/John_Heighway',
  'David Hilbert': 'https://en.wikipedia.org/wiki/David_Hilbert',
  'Giuseppe Peano': 'https://en.wikipedia.org/wiki/Giuseppe_Peano',
  'Arthur Cayley': 'https://en.wikipedia.org/wiki/Arthur_Cayley',
  'Edmond Halley': 'https://en.wikipedia.org/wiki/Edmond_Halley',
  'Michael Barnsley': 'https://en.wikipedia.org/wiki/Michael_Barnsley',
  'Albert E. Bosman': 'https://en.wikipedia.org/wiki/Albert_E._Bosman',
  'Apollonius of Perga': 'https://en.wikipedia.org/wiki/Apollonius_of_Perga',
  'Karl Weierstrass': 'https://en.wikipedia.org/wiki/Karl_Weierstrass',
  'Edward Lorenz': 'https://en.wikipedia.org/wiki/Edward_Norton_Lorenz',
  'Thomas Witten and Leonard Sander': 'https://en.wikipedia.org/wiki/Thomas_Witten',
  'Tamás Vicsek': 'https://en.wikipedia.org/wiki/Tam%C3%A1s_Vicsek',
  'Aristid Lindenmayer': 'https://en.wikipedia.org/wiki/Aristid_Lindenmayer',
  'Teiji Takagi': 'https://en.wikipedia.org/wiki/Teiji_Takagi',
  'Paul Lévy': 'https://en.wikipedia.org/wiki/Paul_L%C3%A9vy',
  'Bill Gosper': 'https://en.wikipedia.org/wiki/Bill_Gosper',
  'E. H. Moore': 'https://en.wikipedia.org/wiki/Eliakim_Hastings_Moore',
  'Georges de Rham': 'https://en.wikipedia.org/wiki/Georges_de_Rham',
  'Felix Hausdorff': 'https://en.wikipedia.org/wiki/Felix_Hausdorff',
  'Raphael Robinson': 'https://en.wikipedia.org/wiki/Raphael_M._Robinson',
  'Charles Radin': 'https://en.wikipedia.org/wiki/Charles_Radin',
  'Robert Ammann': 'https://en.wikipedia.org/wiki/Robert_Ammann',
  'Roger Penrose': 'https://en.wikipedia.org/wiki/Roger_Penrose',
  'Gérard Rauzy': 'https://en.wikipedia.org/wiki/G%C3%A9rard_Rauzy',
  'Otto Rössler': 'https://en.wikipedia.org/wiki/Otto_R%C3%B6ssler',
  'Aleksandr Lyapunov': 'https://en.wikipedia.org/wiki/Aleksandr_Lyapunov',
  'Leon Chua': 'https://en.wikipedia.org/wiki/Leon_Chua',
  'John Hutchinson': 'https://en.wikipedia.org/wiki/John_Hutchinson_(mathematician)',
  'Ken Perlin': 'https://en.wikipedia.org/wiki/Ken_Perlin',
  'Andrey Kolmogorov': 'https://en.wikipedia.org/wiki/Andrey_Kolmogorov',
  'Simon Broadbent and John Hammersley': 'https://en.wikipedia.org/wiki/John_Hammersley',
  'Hermann Minkowski': 'https://en.wikipedia.org/wiki/Hermann_Minkowski',
  'Ernesto Cesàro': 'https://en.wikipedia.org/wiki/Ernesto_Ces%C3%A0ro',
  'Scott Draves': 'https://en.wikipedia.org/wiki/Scott_Draves',
};

/**
 * Get Wikipedia URL for a discoverer
 * @param {string} discovererName - The discoverer's name
 * @returns {string|null} Wikipedia URL or null if not found
 */
export function getDiscovererWikipediaUrl(discovererName) {
  return DISCOVERER_WIKIPEDIA_URLS[discovererName] || null;
}

