package com.iot.repository;

import com.iot.model.SmartHomeScene;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface SceneRepository extends MongoRepository<SmartHomeScene, String> {
}
