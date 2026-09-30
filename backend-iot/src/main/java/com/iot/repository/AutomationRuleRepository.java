package com.iot.repository;

import com.iot.model.AutomationRule;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface AutomationRuleRepository extends MongoRepository<AutomationRule, String> {
    List<AutomationRule> findByEnabledTrueAndSensorId(String sensorId);
}
