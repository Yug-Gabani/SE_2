package com.group6.healthcare.clinic.dto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record DoctorResponse(
        UUID id,
        String fullName,
        String specialty,
        String hospital,
        String avatarUrl,
        BigDecimal rating,
        String bio,
        List<SlotSummary> nextSlots,
        int openSlotCount
) {
    public record SlotSummary(UUID id, OffsetDateTime slotAt) {}
}
