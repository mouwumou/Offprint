---
title: The geometry of uncertainty in population codes
urlname: geometry-of-uncertainty
date: 2025-06-14
updated: 2025-07-02
description: Why I think uncertainty lives on curved manifolds, and a small experiment you can run in an afternoon to see it for yourself.
categories: Research notes
tags:
  - neuroscience
  - geometry
  - statistics
  - representation learning
cover: assets/cover-geometry.png
lang: en
top: true
---

There is a comfortable story we tell about neural codes: a stimulus arrives, a
population of neurons fires, and somewhere in that firing is a *point* — the
brain's estimate of what is out there. It is a good story. It is also, I think,
incomplete, because it leaves no room for the thing the brain spends most of its
energy on: **not knowing**.

This post is about where uncertainty might actually live in a population code,
and why I have come to believe it lives on a curved surface.

## A point is not enough

Suppose a population of $N$ neurons responds to a scalar stimulus $s$ with mean
rates $\mathbf{f}(s) \in \mathbb{R}^N$. As $s$ varies, $\mathbf{f}(s)$ traces
out a one-dimensional curve — the *tuning manifold*. Decoding, in the point
story, is just finding the closest point on that curve.

But a Bayesian observer does not report a point; it reports a posterior. And a
posterior has *width*. So the real question is: where does width go?

The claim I want to defend is that the manifold is not a curve but a *ribbon*,
and that the local width of the ribbon encodes uncertainty:

$$
\operatorname{Var}[s \mid \mathbf{r}] \;\approx\; \frac{1}{\;\mathbf{f}'(s)^{\top}\,\Sigma^{-1}(s)\,\mathbf{f}'(s)\;}
$$

The denominator is the linear Fisher information. When the tuning curve is steep
and the noise is small, information is high and the ribbon is thin. Where the
curve flattens, the ribbon widens — and *curvature* is what couples these two
regimes together.

:::theorem{title="Claim (informal)"}
For a smooth tuning map $\mathbf{f}$ with noise covariance $\Sigma(s)$, local
posterior width is governed by the linear Fisher information, and curvature of
the tuning manifold is the mechanism that redistributes it across the stimulus
range.
:::

:::warning
The simulation below uses Poisson-like noise; heavy-tailed noise changes the
constants but not the shape of the argument.
:::

## An afternoon experiment

You do not need a two-photon microscope to get intuition for this. Here is a
synthetic population you can simulate:

```python
import numpy as np

def population(s, N=200, gain=8.0, noise=0.4):
    """Bell-shaped tuning curves tiled across the stimulus range."""
    centers = np.linspace(-np.pi, np.pi, N)
    rates = gain * np.exp(np.cos(s - centers) - 1.0)   # von Mises tuning
    return rates + noise * np.sqrt(rates) * np.random.randn(N)

# sweep the stimulus and collect responses
S = np.linspace(-np.pi, np.pi, 400)
R = np.stack([population(s) for s in S])
```

Project `R` onto its top three principal components and you will see the ribbon:
a closed loop that is *thin* where tuning curves overlap densely and *bulges*
where they thin out. Uncertainty is not stored in a variable. It is stored in
the shape.

> The representation and its uncertainty are not two things. They are one
> curved thing, read two ways.

## Why curvature, specifically

Flat manifolds are boring in exactly the way that matters here: on a flat sheet,
information is constant everywhere, and there is no room for the code to say "I
am less sure *here* than *there*." Curvature is the degree of freedom that lets
a fixed number of neurons allocate certainty non-uniformly across the stimulus
range.

This framing is developed formally in [@voss2025geometry], with the
decoding stress-test methodology of [@voss2024linear] as the diagnostic.

This reframes a lot of old results. Adaptation, attention, and expectation all
*reshape* tuning curves — and if the ribbon picture is right, reshaping tuning
curves is the same operation as reallocating uncertainty.

## What I am unsure about

Plenty. The linear-Fisher approximation breaks down for wide posteriors, the
noise covariance $\Sigma(s)$ is doing a lot of quiet work in that formula, and I
have said nothing about *time*. But the shape-first framing has changed how I
read data, and that is usually the sign of a hypothesis worth chasing.

If you run the experiment above and see something different, I would genuinely
like to know.
