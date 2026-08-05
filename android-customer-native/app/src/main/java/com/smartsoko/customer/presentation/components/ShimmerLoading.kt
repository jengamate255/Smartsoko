package com.smartsoko.customer.presentation.components

import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp

@Composable
fun ShimmerEffect(
    modifier: Modifier = Modifier,
    width: Dp = 200.dp,
    height: Dp = 20.dp,
    shape: RoundedCornerShape = RoundedCornerShape(4.dp)
) {
    val shimmerColors = listOf(
        MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.6f),
        MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.2f),
        MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.6f)
    )

    val transition = rememberInfiniteTransition(label = "shimmer")
    val translateAnim by transition.animateFloat(
        initialValue = 0f,
        targetValue = 1000f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 1200, easing = LinearEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "shimmer_translate"
    )

    val brush = Brush.linearGradient(
        colors = shimmerColors,
        start = Offset.Zero,
        end = Offset(x = translateAnim, y = translateAnim)
    )

    Box(
        modifier = modifier
            .width(width)
            .height(height)
            .clip(shape)
            .background(brush)
    )
}

@Composable
fun ProductCardShimmer(modifier: Modifier = Modifier) {
    Column(modifier = modifier) {
        ShimmerEffect(
            width = 170.dp,
            height = 140.dp,
            shape = RoundedCornerShape(16.dp)
        )
        Spacer(Modifier.height(8.dp))
        ShimmerEffect(width = 120.dp, height = 16.dp)
        Spacer(Modifier.height(4.dp))
        ShimmerEffect(width = 80.dp, height = 14.dp)
        Spacer(Modifier.height(4.dp))
        ShimmerEffect(width = 60.dp, height = 12.dp)
    }
}

@Composable
fun ProductGridShimmer(modifier: Modifier = Modifier) {
    Column(modifier = modifier.padding(16.dp)) {
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            ProductCardShimmer()
            ProductCardShimmer()
        }
        Spacer(Modifier.height(12.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            ProductCardShimmer()
            ProductCardShimmer()
        }
    }
}

@Composable
fun CategoryRowShimmer(modifier: Modifier = Modifier) {
    Row(
        modifier = modifier.padding(horizontal = 16.dp),
        horizontalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        repeat(6) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                ShimmerEffect(
                    width = 64.dp,
                    height = 64.dp,
                    shape = CircleShape
                )
                Spacer(Modifier.height(8.dp))
                ShimmerEffect(width = 50.dp, height = 12.dp)
            }
        }
    }
}

@Composable
fun CartItemShimmer(modifier: Modifier = Modifier) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .padding(16.dp),
        horizontalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        ShimmerEffect(width = 80.dp, height = 80.dp, shape = RoundedCornerShape(8.dp))
        Column(modifier = Modifier.weight(1f)) {
            ShimmerEffect(width = 140.dp, height = 16.dp)
            Spacer(Modifier.height(8.dp))
            ShimmerEffect(width = 100.dp, height = 12.dp)
            Spacer(Modifier.height(8.dp))
            ShimmerEffect(width = 60.dp, height = 14.dp)
        }
    }
}
