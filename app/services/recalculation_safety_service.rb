class RecalculationSafetyService
  WARN_THRESHOLD_SECONDS = 5

  # Wraps a recalculation block with timing and safety logging.
  # If the block exceeds WARN_THRESHOLD_SECONDS, logs a warning and
  # surfaces a performance notice to staff users via AuditLog.
  #
  # Usage:
  #   RecalculationSafetyService.with_safety(entity: holding, user_id: uid) do
  #     # recalculation logic
  #   end
  def self.with_safety(entity:, user_id:, &block)
    start_time = Process.clock_gettime(Process::CLOCK_MONOTONIC)
    result = block.call
    elapsed = Process.clock_gettime(Process::CLOCK_MONOTONIC) - start_time

    if elapsed > WARN_THRESHOLD_SECONDS
      log_performance_warning(entity: entity, user_id: user_id, elapsed: elapsed)
    end

    result
  end

  private

  def self.log_performance_warning(entity:, user_id:, elapsed:)
    Rails.logger.warn(
      "[RecalculationSafety] SLOW recalculation on #{entity.class.name}##{entity.id} " \
      "for user #{user_id}: #{elapsed.round(2)}s (threshold: #{WARN_THRESHOLD_SECONDS}s)"
    )

    AuditLog.log!(
      user_id: user_id,
      entity_type: entity.class.name,
      entity_id: entity.id,
      action_type: "RECALCULATION",
      before_json: nil,
      after_json: nil,
      metadata: {
        performance_warning: true,
        elapsed_seconds: elapsed.round(2),
        threshold_seconds: WARN_THRESHOLD_SECONDS,
        message: "Recalculation exceeded #{WARN_THRESHOLD_SECONDS}s threshold"
      }
    )
  end
end
