/*
 *  (C) Copyright 2017 TheOtherP (theotherp@gmx.de)
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

package org.nzbhydra.web;

import com.google.common.base.Joiner;
import com.google.common.collect.Sets;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import net.logstash.logback.encoder.org.apache.commons.lang.exception.ExceptionUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.ConversionNotSupportedException;
import org.springframework.beans.TypeMismatchException;
import org.springframework.http.*;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.http.converter.HttpMessageNotWritableException;
import org.springframework.stereotype.Component;
import org.springframework.validation.BindException;
import org.springframework.web.HttpMediaTypeNotAcceptableException;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingPathVariableException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.ServletRequestBindingException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseBody;
import org.springframework.web.context.request.async.AsyncRequestTimeoutException;
import org.springframework.web.multipart.support.MissingServletRequestPartException;
import org.springframework.web.servlet.NoHandlerFoundException;

import javax.servlet.http.HttpServletRequest;
import java.util.*;
import java.util.Map.Entry;
import java.util.stream.Collectors;

@ControllerAdvice
@Component
//Do NOT extend ResponseEntityExceptionHandler or it won't work
public class ErrorHandler {

    private static final Logger logger = LoggerFactory.getLogger(ErrorHandler.class);
    @SuppressWarnings("unchecked")
    private static final Set<Class<? extends Exception>> EXCEPTIONS_LOG_WITHOUT_STACKTRACE = Sets.newHashSet(
            HttpRequestMethodNotSupportedException.class,
            HttpMediaTypeNotSupportedException.class,
            HttpMediaTypeNotAcceptableException.class,
            MissingPathVariableException.class,
            MissingServletRequestParameterException.class,
            ServletRequestBindingException.class,
            ConversionNotSupportedException.class,
            TypeMismatchException.class,
            HttpMessageNotReadableException.class,
            HttpMessageNotWritableException.class,
            MethodArgumentNotValidException.class,
            MissingServletRequestPartException.class,
            BindException.class,
            NoHandlerFoundException.class,
            AsyncRequestTimeoutException.class
    );

    @ExceptionHandler(value = { HttpRequestMethodNotSupportedException.class,
            HttpMediaTypeNotSupportedException.class,
            HttpMediaTypeNotAcceptableException.class,
            MissingPathVariableException.class,
            MissingServletRequestParameterException.class,
            ServletRequestBindingException.class,
            ConversionNotSupportedException.class,
            TypeMismatchException.class,
            HttpMessageNotReadableException.class,
            HttpMessageNotWritableException.class,
            MethodArgumentNotValidException.class,
            MissingServletRequestPartException.class,
            BindException.class,
            NoHandlerFoundException.class,
            AsyncRequestTimeoutException.class})
    @ResponseBody
    public ResponseEntity<Object> handleConflict(Exception ex, HttpServletRequest request) {
        String fullParametersString = "";
        String parametersString = "";
        if (!request.getParameterMap().isEmpty()) {
            parametersString = request.getParameterMap().entrySet().stream().map(this::getFormattedEntry).collect(Collectors.joining(", "));
            fullParametersString = " and parameters " + parametersString;
        }
        String requestURI = request.getRequestURI();
        HttpStatus status = getStatusForException(ex);
            String message = "Unexpected error when client tried to access path " + requestURI + fullParametersString + ". Error message: " + ex.getMessage();
        if (EXCEPTIONS_LOG_WITHOUT_STACKTRACE.contains(ex.getClass())) {
            logger.warn(message);
        } else {
            logger.warn("Unexpected error when client tried to access path " + requestURI + fullParametersString, ex);
        }
        Object bodyOfResponse;
        List<MediaType> mediaTypes = new ArrayList<>();
        try {
            mediaTypes = resolveMediaTypes(request);
        } catch (HttpMediaTypeNotAcceptableException e) {
            logger.error("Unable to parse Media Types of request", e);
        }
        if (mediaTypes.contains(MediaType.APPLICATION_JSON)) {
            bodyOfResponse = new JsonExceptionResponse(ExceptionUtils.getStackTrace(ex), requestURI, parametersString, status.value(), ex.getMessage());
        } else {
            bodyOfResponse = message;
        }

        return new ResponseEntity<>(bodyOfResponse, new HttpHeaders(), status);
    }

    protected String getFormattedEntry(Entry<String, String[]> x) {
        return x.getKey() + "=" + (
                x.getValue().length == 1
                        ? x.getValue()[0]
                        : ("[" + Joiner.on(", ").join(x.getValue()) + "]")
        );
    }

    private HttpStatus getStatusForException(Exception ex) {
        HttpStatus status = HttpStatus.INTERNAL_SERVER_ERROR;
        if (ex instanceof org.springframework.web.servlet.mvc.multiaction.NoSuchRequestHandlingMethodException) {
            status = HttpStatus.NOT_FOUND;
        } else if (ex instanceof HttpRequestMethodNotSupportedException) {
            status = HttpStatus.METHOD_NOT_ALLOWED;
        } else if (ex instanceof HttpMediaTypeNotSupportedException) {
            status = HttpStatus.UNSUPPORTED_MEDIA_TYPE;
        } else if (ex instanceof HttpMediaTypeNotAcceptableException) {
            status = HttpStatus.NOT_ACCEPTABLE;
        } else if (ex instanceof MissingPathVariableException) {
            status = HttpStatus.INTERNAL_SERVER_ERROR;
        } else if (ex instanceof MissingServletRequestParameterException) {
            status = HttpStatus.BAD_REQUEST;
        } else if (ex instanceof ServletRequestBindingException) {
            status = HttpStatus.BAD_REQUEST;
        } else if (ex instanceof ConversionNotSupportedException) {
            status = HttpStatus.INTERNAL_SERVER_ERROR;
        } else if (ex instanceof TypeMismatchException) {
            status = HttpStatus.BAD_REQUEST;
        } else if (ex instanceof HttpMessageNotReadableException) {
            status = HttpStatus.BAD_REQUEST;
        } else if (ex instanceof HttpMessageNotWritableException) {
            status = HttpStatus.INTERNAL_SERVER_ERROR;
        } else if (ex instanceof MethodArgumentNotValidException) {
            status = HttpStatus.BAD_REQUEST;
        } else if (ex instanceof MissingServletRequestPartException) {
            status = HttpStatus.BAD_REQUEST;
        } else if (ex instanceof BindException) {
            status = HttpStatus.BAD_REQUEST;
        } else if (ex instanceof NoHandlerFoundException) {
            status = HttpStatus.NOT_FOUND;
        } else if (ex instanceof AsyncRequestTimeoutException) {
            status = HttpStatus.SERVICE_UNAVAILABLE;
        }
        return status;
    }

    private List<MediaType> resolveMediaTypes(HttpServletRequest request)
            throws HttpMediaTypeNotAcceptableException {

        Enumeration<String> headerValueArray = request.getHeaders(HttpHeaders.ACCEPT);
        if (headerValueArray == null) {
            return Collections.<MediaType>emptyList();
        }

        List<String> headerValues = Collections.list(headerValueArray);
        try {
            List<MediaType> mediaTypes = MediaType.parseMediaTypes(headerValues);
            MediaType.sortBySpecificityAndQuality(mediaTypes);
            return mediaTypes;
        }
        catch (InvalidMediaTypeException ex) {
            throw new HttpMediaTypeNotAcceptableException(
                    "Could not parse 'Accept' header " + headerValues + ": " + ex.getMessage());
        }
    }

    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class JsonExceptionResponse {
        private String exception;
        private String path;
        private String parameters;
        private int status;
        private String message;
    }


}