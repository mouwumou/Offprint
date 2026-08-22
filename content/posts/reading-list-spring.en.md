---
title: Three papers that changed how I read data this spring
urlname: reading-list-spring
date: 2025-03-11
updated: 2025-03-11
description: A short annotated reading list — dimensionality, double descent, and the quiet return of the humble GLM.
categories: Reading
tags:
  - reading list
  - statistics
  - deep learning
lang: en
---

I keep a running note of papers that do not just add a fact but *change the
lens*. Three earned their place this spring.

## 1. On the intrinsic dimension of representations

The headline result — that useful representations often live on a
surprisingly low-dimensional manifold — is not new. What is new here is the
estimator: robust, nearly hyperparameter-free, and honest about its confidence
intervals. I have already swapped it into my own analysis.

The practical lesson: **report a dimension with an error bar, or do not report
one at all.**

## 2. Double descent, revisited without the mystique

A patient, deflationary paper. It takes the double-descent curve and shows how
much of it dissolves once you account for the effective number of parameters
rather than the raw count. Not every surprising curve needs a surprising theory;
sometimes it needs a better $x$-axis.

## 3. The GLM that would not die

A generalized linear model, fit carefully, matched a much larger network on a
neural prediction benchmark — and told you *why*. This is the paper I hand to
students who think interpretability and performance are always in tension. They
are not; they are often just in different notation.

---

None of these are flashy. All three made my next month of work sharper. That is
the only test I trust for a reading list.
